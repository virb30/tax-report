import { z } from 'zod';

type ValidatedHandlerConfig<TInput, TSuccessOutput, TErrorOutput = TSuccessOutput> = {
  channel: string;
  schema: z.ZodType<TInput>;
  execute: (payload: TInput) => Promise<TSuccessOutput> | TSuccessOutput;
  payloadErrorMessage?: string;
  requireObjectInput?: boolean;
  onError?: (error: unknown) => TErrorOutput;
};

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

export function registerValidatedHandler<TInput, TSuccessOutput, TErrorOutput = TSuccessOutput>(
  ipcMain: Pick<Electron.IpcMain, 'handle'>,
  config: ValidatedHandlerConfig<TInput, TSuccessOutput, TErrorOutput>,
): void {
  ipcMain.handle(config.channel, async (_event, input: unknown) => {
    try {
      const payload = parseIpcPayload(config.schema, input, {
        payloadErrorMessage: config.payloadErrorMessage,
        requireObjectInput: config.requireObjectInput,
      });

      return await config.execute(payload);
    } catch (error) {
      if (config.onError) {
        return config.onError(error);
      }

      throw error;
    }
  });
}
