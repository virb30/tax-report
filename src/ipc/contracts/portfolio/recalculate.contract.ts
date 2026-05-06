import type { IpcResult } from '../../ipc-result';
import type { AveragePriceFeeMode } from '../domain';

export type { AveragePriceFeeMode } from '../domain';

export type RecalculatePositionCommand = {
  ticker: string;
  year: number;
  averagePriceFeeMode?: AveragePriceFeeMode;
};

export type RecalculatePositionResult = IpcResult<void>;
