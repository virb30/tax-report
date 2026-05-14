import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

function readCorrelationId(request: Request): string {
  const headerValue = request.header(CORRELATION_ID_HEADER);

  if (headerValue?.trim()) {
    return headerValue.trim();
  }

  return randomUUID();
}

export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const correlationId = readCorrelationId(request);
  const locals = response.locals as Record<string, unknown>;

  locals.correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}

export function getCorrelationId(response: Response): string {
  const locals = response.locals as Record<string, unknown>;
  const correlationId = locals.correlationId;

  if (typeof correlationId === 'string' && correlationId.length > 0) {
    return correlationId;
  }

  return 'unknown';
}
