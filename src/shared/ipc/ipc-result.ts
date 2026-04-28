import type { AppError, AppErrorKind } from '../app-error';

export type IpcResultError = {
  code: string;
  message: string;
  kind: AppErrorKind;
  details?: unknown;
};

export type IpcResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: IpcResultError;
    };

export function ipcSuccess<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

export function ipcFailure(error: AppError | IpcResultError): IpcResult<never> {
  const resultError: IpcResultError = {
    code: error.code,
    message: error.message,
    kind: error.kind,
  };

  if (error.details !== undefined) {
    resultError.details = error.details;
  }

  return {
    ok: false,
    error: resultError,
  };
}
