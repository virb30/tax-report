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
