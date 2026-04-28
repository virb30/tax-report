import type { IpcResult } from '../../shared/ipc/ipc-result';

export function unwrapIpcResult<T>(result: IpcResult<T>): T {
  if (result.ok) {
    return result.data;
  }

  throw new Error(result.error.message);
}
