import type { IpcResult } from '../../ipc-result';

export type DeletePositionCommand = {
  ticker: string;
  year: number;
};

export type DeleteAllPositionsCommand = {
  year: number;
};

export type DeletePositionData = {
  deleted: boolean;
};

export type DeleteAllPositionsData = {
  deletedCount: number;
};

export type DeletePositionResult = IpcResult<DeletePositionData>;
export type DeleteAllPositionsResult = IpcResult<DeleteAllPositionsData>;
