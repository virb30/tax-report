import { AssetResolutionStatus, type AssetType } from '../../../shared/types/domain';
import type { ImportPreviewReviewState } from '../../../shared/contracts/import-preview-review.contract';
import { AssetTypeResolverService } from './asset-type-resolver.service';
import { UnsupportedImportClassifier } from './unsupported-import-classifier.service';

type ResolveImportPreviewReviewInput = {
  fileAssetType: AssetType | null;
  fileAssetTypeLabel: string | null;
  catalogAssetType: AssetType | null;
  hasSupportedEvent: boolean;
};

export class ImportPreviewReviewResolver {
  constructor(
    private readonly assetTypeResolver: AssetTypeResolverService = new AssetTypeResolverService(),
    private readonly unsupportedClassifier: UnsupportedImportClassifier = new UnsupportedImportClassifier(),
  ) {}

  resolve(input: ResolveImportPreviewReviewInput): ImportPreviewReviewState {
    const unsupportedReason = this.unsupportedClassifier.classify({
      sourceAssetType: input.fileAssetType,
      sourceAssetTypeLabel: input.fileAssetTypeLabel,
      hasSupportedEvent: input.hasSupportedEvent,
    });

    if (unsupportedReason) {
      return {
        resolvedAssetType: null,
        resolutionStatus: AssetResolutionStatus.Unresolved,
        needsReview: false,
        unsupportedReason,
      };
    }

    return this.assetTypeResolver.resolve({
      fileAssetType: input.fileAssetType,
      catalogAssetType: input.catalogAssetType,
    });
  }
}
