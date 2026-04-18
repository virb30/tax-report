export type ImportConsolidatedPositionCommand = {
  filePath: string;
  year: number;
};

export type ImportConsolidatedPositionResult = {
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

export type PreviewConsolidatedPositionResult = {
  rows: ConsolidatedPositionPreviewRow[];
};
