import type {
  AssetResolutionStatus,
  AssetType,
  UnsupportedImportReason,
} from '../types/domain';

export type ImportPreviewReviewState = {
  resolvedAssetType: AssetType | null;
  resolutionStatus: AssetResolutionStatus;
  needsReview: boolean;
  unsupportedReason: UnsupportedImportReason | null;
};

export type ImportPreviewSummary = {
  supportedRows: number;
  pendingRows: number;
  unsupportedRows: number;
};
