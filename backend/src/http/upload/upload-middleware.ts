import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import multer from 'multer';
import { HttpValidationError } from '../errors/http-error';
import type { BackendRuntimeConfig } from '../../app/infra/runtime/backend-runtime-config';

const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx']);
const XLSX_MAGIC = '504b0304';
const UTF8_BOM = 'efbbbf';

export interface UploadedFileInput {
  filePath: string;
  originalName: string;
  size: number;
}

type RequestWithFile = Request & {
  file?: Express.Multer.File;
};

function createUploadDirectory(): string {
  return path.join(os.tmpdir(), 'tax-report-uploads');
}

function createStorage(): multer.StorageEngine {
  return multer.diskStorage({
    destination(_request, _file, callback): void {
      const uploadDirectory = createUploadDirectory();
      fs.mkdir(uploadDirectory, { recursive: true })
        .then(() => callback(null, uploadDirectory))
        .catch((error: unknown) => callback(error as Error, uploadDirectory));
    },
    filename(_request, file, callback): void {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  });
}

function createMulterMiddleware(config: BackendRuntimeConfig, fieldName: string): RequestHandler {
  return multer({
    storage: createStorage(),
    limits: {
      fileSize: config.uploads.maxFileSizeBytes,
      files: config.uploads.maxFiles,
    },
  }).single(fieldName);
}

function createCleanupMiddleware(): RequestHandler {
  return (request: RequestWithFile, response, next): void => {
    response.on('finish', () => {
      if (!request.file?.path) {
        return;
      }

      fs.unlink(request.file.path).catch(() => undefined);
    });

    next();
  };
}

function isTextLike(buffer: Buffer): boolean {
  if (buffer.length === 0) {
    return true;
  }

  return !buffer.includes(0);
}

async function assertSupportedFile(file: Express.Multer.File): Promise<void> {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new HttpValidationError('Unsupported upload file type', {
      supportedExtensions: [...SUPPORTED_EXTENSIONS],
    });
  }

  const handle = await fs.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(4);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const signature = buffer.subarray(0, bytesRead).toString('hex');

    if (extension === '.xlsx' && !signature.startsWith(XLSX_MAGIC)) {
      throw new HttpValidationError('Uploaded XLSX file content is invalid');
    }

    if (extension === '.csv' && !isTextLike(buffer.subarray(0, bytesRead))) {
      throw new HttpValidationError('Uploaded CSV file content is invalid');
    }

    if (extension === '.csv' && signature.startsWith(UTF8_BOM)) {
      return;
    }
  } finally {
    await handle.close();
  }
}

function mapMulterError(error: unknown): unknown {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return new HttpValidationError('Uploaded file exceeds the configured size limit');
    }

    return new HttpValidationError('Invalid multipart upload', {
      code: error.code,
    });
  }

  return error;
}

export function uploadFile(config: BackendRuntimeConfig, fieldName = 'file'): RequestHandler[] {
  const multerMiddleware = createMulterMiddleware(config, fieldName);
  const cleanupMiddleware = createCleanupMiddleware();

  return [
    cleanupMiddleware,
    (request: RequestWithFile, response, next): void => {
      multerMiddleware(request, response, (error: unknown) => {
        if (error) {
          next(mapMulterError(error));
          return;
        }

        next();
      });
    },
    (request: RequestWithFile, _response, next): void => {
      if (!request.file) {
        next(new HttpValidationError('Multipart upload must include a file field'));
        return;
      }

      assertSupportedFile(request.file)
        .then(() => next())
        .catch(next);
    },
  ];
}

export function getUploadedFile(request: Request): UploadedFileInput {
  const uploadedRequest = request as RequestWithFile;

  if (!uploadedRequest.file) {
    throw new HttpValidationError('Multipart upload must include a file field');
  }

  return {
    filePath: uploadedRequest.file.path,
    originalName: uploadedRequest.file.originalname,
    size: uploadedRequest.file.size,
  };
}
