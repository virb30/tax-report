import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../../shared/app-error';
import { HttpError } from '../errors/http-error';

const NOT_FOUND_PATTERNS = ['nao encontrada', 'não encontrada', 'not found'];

function isNotFoundMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return NOT_FOUND_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));
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

export function asyncRoute(
  handler: (request: Request, response: Response) => Promise<void>,
): RequestHandler {
  return (request: Request, response: Response, next: NextFunction): void => {
    handler(request, response).catch((error: unknown) => next(normalizeRouteError(error)));
  };
}
