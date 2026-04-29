import type { IpcResult } from '../ipc/ipc-result';
import type { AssetType } from '../types/domain';
import type {
  ImportPreviewReviewState,
  ImportPreviewSummary,
} from './import-preview-review.contract';

export type ImportConsolidatedPositionCommand = {
  filePath: string;
  year: number;
};

export type ImportConsolidatedPositionData = {
  importedCount: number;
  recalculatedTickers: string[];
};

export type PreviewConsolidatedPositionCommand = {
  filePath: string;
};

export type ConsolidatedPositionPreviewRow = ImportPreviewReviewState & {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
  sourceAssetType: AssetType | null;
};

export type PreviewConsolidatedPositionData = {
  rows: ConsolidatedPositionPreviewRow[];
  summary: ImportPreviewSummary;
};

export type ImportConsolidatedPositionResult = IpcResult<ImportConsolidatedPositionData>;

export type PreviewConsolidatedPositionResult = IpcResult<PreviewConsolidatedPositionData>;
