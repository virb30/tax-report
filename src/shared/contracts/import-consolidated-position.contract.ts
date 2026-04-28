import type { IpcResult } from '../ipc/ipc-result';

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

export type ConsolidatedPositionPreviewRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
};

export type PreviewConsolidatedPositionData = {
  rows: ConsolidatedPositionPreviewRow[];
};

export type ImportConsolidatedPositionResult = IpcResult<ImportConsolidatedPositionData>;

export type PreviewConsolidatedPositionResult = IpcResult<PreviewConsolidatedPositionData>;
