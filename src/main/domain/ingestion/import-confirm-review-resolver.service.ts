import { AssetResolutionStatus, type AssetType } from '../../../shared/types/domain';
import type { ImportPreviewReviewState } from '../../../shared/contracts/import-preview-review.contract';
import { ImportPreviewReviewResolver } from './import-preview-review-resolver.service';

type ResolveImportConfirmReviewInput = {
  fileAssetType: AssetType | null;
  fileAssetTypeLabel: string | null;
  catalogAssetType: AssetType | null;
  hasSupportedEvent: boolean;
  overrideAssetType: AssetType | null;
};

export class ImportConfirmReviewResolver {
  constructor(
    private readonly previewResolver: ImportPreviewReviewResolver = new ImportPreviewReviewResolver(),
  ) {}

  resolve(input: ResolveImportConfirmReviewInput): ImportPreviewReviewState {
    const previewState = this.previewResolver.resolve({
      fileAssetType: input.fileAssetType,
      fileAssetTypeLabel: input.fileAssetTypeLabel,
      catalogAssetType: input.catalogAssetType,
      hasSupportedEvent: input.hasSupportedEvent,
    });

    if (previewState.unsupportedReason) {
      return previewState;
    }

    if (input.overrideAssetType) {
      return {
        resolvedAssetType: input.overrideAssetType,
        resolutionStatus: AssetResolutionStatus.ManualOverride,
        needsReview: false,
        unsupportedReason: null,
      };
    }

    return previewState;
  }
}
