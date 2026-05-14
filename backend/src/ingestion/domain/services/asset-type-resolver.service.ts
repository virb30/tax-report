import {
  AssetResolutionStatus,
  type AssetType,
  type ImportPreviewReviewState,
} from '../../../shared/types/domain';

type ResolveAssetTypeInput = {
  fileAssetType: AssetType | null;
  catalogAssetType: AssetType | null;
};

export class AssetTypeResolverService {
  resolve(input: ResolveAssetTypeInput): ImportPreviewReviewState {
    if (input.fileAssetType) {
      return {
        resolvedAssetType: input.fileAssetType,
        resolutionStatus: AssetResolutionStatus.ResolvedFromFile,
        needsReview: false,
        unsupportedReason: null,
      };
    }

    if (input.catalogAssetType) {
      return {
        resolvedAssetType: input.catalogAssetType,
        resolutionStatus: AssetResolutionStatus.ResolvedFromCatalog,
        needsReview: false,
        unsupportedReason: null,
      };
    }

    return {
      resolvedAssetType: null,
      resolutionStatus: AssetResolutionStatus.Unresolved,
      needsReview: true,
      unsupportedReason: null,
    };
  }
}
