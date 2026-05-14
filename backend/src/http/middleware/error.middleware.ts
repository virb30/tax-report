import type { ErrorRequestHandler } from 'express';
import type { BackendLogger } from '../logging/safe-error-logger';
import { mapHttpError } from '../errors/http-error-mapper';
import { getCorrelationId } from './correlation-id.middleware';
import { logRequestFailure } from '../logging/safe-error-logger';

export function createErrorMiddleware(logger: BackendLogger): ErrorRequestHandler {
  return (error, request, response, next) => {
    void next;

    const mappedError = mapHttpError(error);
    const correlationId = getCorrelationId(response);

    logRequestFailure(logger, {
      request,
      status: mappedError.status,
      errorCode: mappedError.code,
      correlationId,
      metadata: error,
    });

    response.status(mappedError.status).json(mappedError.body);
  };
}
