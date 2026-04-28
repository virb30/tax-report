import type { IpcResult } from '../ipc/ipc-result';

export type DeletePositionCommand = {
  ticker: string;
  year: number;
};

export type DeletePositionData = {
  deleted: boolean;
};

export type DeletePositionResult = IpcResult<DeletePositionData>;
