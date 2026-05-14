import { AppError } from '../../shared/app-error';
import { HttpError } from './http-error';

export interface JsonErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface MappedHttpError {
  status: number;
  code: string;
  message: string;
  body: JsonErrorBody;
}

const DEFAULT_ERROR = {
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Unexpected backend error',
  status: 500,
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

function isSafeStructuredDetails(value: unknown): boolean {
  if (value === null) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isSafeStructuredDetails(item));
  }

  if (!isPlainRecord(value)) {
    return false;
  }

  return Object.values(value).every((item) => isSafeStructuredDetails(item));
}

function mapAppErrorStatus(error: AppError): number {
  if (error.kind === 'validation') {
    return 400;
  }

  if (error.kind === 'not_found') {
    return 404;
  }

  if (error.kind === 'conflict') {
    return 409;
  }

  if (error.kind === 'business') {
    return 422;
  }

  return DEFAULT_ERROR.status;
}

function createBody(input: { code: string; message: string; details?: unknown }): JsonErrorBody {
  const { code, details, message } = input;
  const errorBody: JsonErrorBody = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined && isSafeStructuredDetails(details)) {
    errorBody.error.details = details;
  }

  return errorBody;
}

export function mapHttpError(error: unknown): MappedHttpError {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      body: createBody({
        code: error.code,
        message: error.message,
        details: error.details,
      }),
    };
  }

  if (error instanceof AppError) {
    return {
      status: mapAppErrorStatus(error),
      code: error.code,
      message: error.message,
      body: createBody({
        code: error.code,
        message: error.message,
        details: error.details,
      }),
    };
  }

  return {
    status: DEFAULT_ERROR.status,
    code: DEFAULT_ERROR.code,
    message: DEFAULT_ERROR.message,
    body: createBody(DEFAULT_ERROR),
  };
}
