import { z } from 'zod';

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

export function parseIpcPayload<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options: {
    payloadErrorMessage?: string;
    requireObjectInput?: boolean;
  } = {},
): T {
  if (options.requireObjectInput !== false && (!input || typeof input !== 'object')) {
    throw new Error(options.payloadErrorMessage ?? 'Invalid IPC payload.');
  }

  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(buildIpcErrorMessage(error));
    }

    throw error;
  }
}
