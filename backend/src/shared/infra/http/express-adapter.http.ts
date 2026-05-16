import cors from 'cors';
import express, { type Express, type Request, type RequestHandler, type Response } from 'express';
import { AppError } from '../../app-error';
import type { BackendRuntimeConfig } from '../../../app/infra/runtime/backend-runtime-config';
import { HttpError } from '../../../http/errors/http-error';
import { uploadFile } from '../../../http/upload/upload-middleware';
import { correlationIdMiddleware } from '../../../http/middleware/correlation-id.middleware';
import type { Http, HttpMiddlewareSpec, HttpRequest, HttpRoute } from './http.interface';

function createHttpRequest(request: Request): HttpRequest {
  return {
    params: request.params,
    query: request.query,
    body: request.body,
    raw: request,
  };
}

const notFoundPatterns = ['nao encontrada', 'não encontrada', 'not found'];

function isNotFoundMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return notFoundPatterns.some((pattern) => normalizedMessage.includes(pattern));
}

function normalizeRouteError(error: unknown): unknown {
  if (error instanceof HttpError || error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (isNotFoundMessage(error.message)) {
      return new AppError('NOT_FOUND', error.message, 'not_found');
    }

    return new AppError('BUSINESS_RULE_VIOLATION', error.message, 'business');
  }

  return error;
}

export class ExpressAdapter implements Http {
  readonly app: Express;
  private readonly config: BackendRuntimeConfig;

  constructor(input: { config: BackendRuntimeConfig; app?: Express }) {
    this.app = input.app ?? express();
    this.config = input.config;
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(correlationIdMiddleware);
  }

  on(route: HttpRoute): void {
    const middlewares = this.resolveMiddlewares(route.middlewares);
    const expressPath = this.toExpressPath(route.path);

    this.app[route.method](
      expressPath,
      ...middlewares,
      async (request: Request, response: Response, next) => {
        try {
          const output = await route.handler(createHttpRequest(request));
          response.status(output.statusCode).json(output.body);
        } catch (error: unknown) {
          next(normalizeRouteError(error));
        }
      },
    );
  }

  listen(port: number, callback?: () => void): void {
    this.app.listen(port, callback);
  }

  private resolveMiddlewares(specs: HttpMiddlewareSpec[] | undefined): RequestHandler[] {
    if (!specs?.length) {
      return [];
    }

    return specs.flatMap((spec) => this.resolveMiddleware(spec));
  }

  private resolveMiddleware(spec: HttpMiddlewareSpec): RequestHandler[] {
    switch (spec.type) {
      case 'spreadsheetUpload':
        return uploadFile(this.config, spec.fieldName);
    }
  }

  private toExpressPath(path: string): string {
    return path.replace(/:/g, '\\:').replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, ':$1');
  }
}
