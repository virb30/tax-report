import type { IpcResult } from '../../ipc/ipc-result';

export type RecalculatePositionCommand = {
  ticker: string;
  year: number;
};

export type RecalculatePositionResult = IpcResult<void>;
