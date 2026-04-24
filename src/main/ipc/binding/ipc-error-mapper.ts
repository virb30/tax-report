import { buildIpcErrorMessage } from '../controllers/ipc-handler.utils';

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
