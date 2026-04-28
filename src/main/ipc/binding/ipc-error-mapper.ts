import { AppError } from '../../../shared/app-error';
import { ipcFailure, type IpcResult } from '../../../shared/ipc/ipc-result';
import { buildIpcErrorMessage } from './ipc-payload';

export type IpcFailureResult = {
  success: false;
  error: string;
};

export function toIpcFailureResult(error: unknown, fallbackMessage: string): IpcFailureResult {
  return {
    success: false,
    error: buildIpcErrorMessage(error, fallbackMessage),
  };
}

export function toIpcResultFailure(error: unknown): IpcResult<never> {
  if (error instanceof AppError) {
    return ipcFailure(error);
  }

  return ipcFailure({
    code: 'UNEXPECTED_ERROR',
    message: 'Erro inesperado ao processar a requisição.',
    kind: 'unexpected',
  });
}
