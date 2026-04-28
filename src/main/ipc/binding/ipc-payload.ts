import { z } from 'zod';
import { AppError } from '../../../shared/app-error';

export const INVALID_IPC_PAYLOAD_CODE = 'INVALID_PAYLOAD';

export function buildIpcErrorMessage(
  error: unknown,
  fallbackMessage = 'Erro ao processar a requisição.',
): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

function toInvalidPayloadError(message: string): AppError {
  return new AppError(INVALID_IPC_PAYLOAD_CODE, message, 'validation');
}

export function parseIpcPayload<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options: {
    payloadErrorMessage?: string;
    requireObjectInput?: boolean;
  } = {},
): T {
  if (options.requireObjectInput !== false && (!input || typeof input !== 'object')) {
    throw toInvalidPayloadError(options.payloadErrorMessage ?? 'Invalid IPC payload.');
  }

  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw toInvalidPayloadError(buildIpcErrorMessage(error));
    }

    throw error;
  }
}
