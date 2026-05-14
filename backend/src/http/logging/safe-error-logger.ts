import type { Request } from 'express';

export interface BackendLogger {
  error(metadata: Record<string, unknown>, message: string): void;
}

export interface FailureLogInput {
  request: Request;
  status: number;
  errorCode: string;
  correlationId: string;
  metadata?: unknown;
}

const CNPJ_PATTERN = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const SENSITIVE_KEYS = new Set([
  'buffer',
  'content',
  'contents',
  'data',
  'file',
  'files',
  'raw',
  'rows',
  'taxRows',
  'uploadedFile',
]);

function redactString(value: string): string {
  return value.replace(CNPJ_PATTERN, '[REDACTED_CNPJ]');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

export function redactSensitiveMetadata(value: unknown): unknown {
  if (typeof value === 'string') {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveMetadata(item));
  }

  if (!isPlainRecord(value)) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (SENSITIVE_KEYS.has(key)) {
        return [key, '[REDACTED]'];
      }

      return [key, redactSensitiveMetadata(item)];
    }),
  );
}

export function logRequestFailure(logger: BackendLogger, input: FailureLogInput): void {
  const { correlationId, errorCode, metadata, request, status } = input;

  logger.error(
    {
      correlationId,
      errorCode,
      method: request.method,
      metadata: redactSensitiveMetadata(metadata),
      route: request.originalUrl,
      status,
    },
    'Backend request failed',
  );
}
