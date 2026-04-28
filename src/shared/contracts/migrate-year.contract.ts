import type { IpcResult } from '../ipc/ipc-result';

export type MigrateYearCommand = {
  sourceYear: number;
  targetYear: number;
};

export type MigrateYearData = {
  migratedPositionsCount: number;
  createdTransactionsCount: number;
  message?: string;
};

export type MigrateYearResult = IpcResult<MigrateYearData>;
