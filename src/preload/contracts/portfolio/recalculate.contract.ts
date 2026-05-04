import type { IpcResult } from '../../ipc/ipc-result';
import type { AveragePriceFeeMode } from '../../../shared/types/domain';

export type { AveragePriceFeeMode } from '../../../shared/types/domain';

export type RecalculatePositionCommand = {
  ticker: string;
  year: number;
  averagePriceFeeMode?: AveragePriceFeeMode;
};

export type RecalculatePositionResult = IpcResult<void>;
