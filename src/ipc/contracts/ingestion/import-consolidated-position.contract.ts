import type { IpcResult } from '../../ipc-result';
import type {
  AssetTypeOverrideDecision,
  ImportPreviewReviewState,
  ImportPreviewSummary,
} from './import-preview-review.contract';
import type { AssetType } from '../domain';

export type ImportConsolidatedPositionCommand = {
  filePath: string;
  year: number;
  assetTypeOverrides: AssetTypeOverrideDecision[];
};

export type ImportConsolidatedPositionData = {
  importedCount: number;
  recalculatedTickers: string[];
  skippedUnsupportedRows: number;
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
