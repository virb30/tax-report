import { AssetType, UnsupportedImportReason } from '../../../shared/types/domain';

type ClassifyInput = {
  sourceAssetType: AssetType | null;
  sourceAssetTypeLabel: string | null;
  hasSupportedEvent: boolean;
};

export class UnsupportedImportClassifier {
  classify(input: ClassifyInput): UnsupportedImportReason | null {
    if (!input.hasSupportedEvent) {
      return UnsupportedImportReason.UnsupportedEvent;
    }

    if (input.sourceAssetType === null && !input.sourceAssetTypeLabel) {
      return null;
    }

    if (input.sourceAssetType !== null && this.isSupportedAssetType(input.sourceAssetType)) {
      return null;
    }

    return UnsupportedImportReason.UnsupportedAssetType;
  }

  normalizeAssetType(value: unknown): AssetType | null {
    if (typeof value !== 'string' && typeof value !== 'number') {
      return null;
    }

    const normalized = String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

    if (!normalized) {
      return null;
    }

    const aliases: Record<string, AssetType> = {
      acao: AssetType.Stock,
      acoes: AssetType.Stock,
      bdr: AssetType.Bdr,
      bdrs: AssetType.Bdr,
      etf: AssetType.Etf,
      etfs: AssetType.Etf,
      fii: AssetType.Fii,
      fiiimobiliario: AssetType.Fii,
      fiis: AssetType.Fii,
      fundoimobiliario: AssetType.Fii,
      fundosimobiliarios: AssetType.Fii,
      stock: AssetType.Stock,
    };

    const compact = normalized.replace(/[\s_-]+/g, '');
    return aliases[compact] ?? null;
  }

  private isSupportedAssetType(assetType: AssetType): boolean {
    return Object.values(AssetType).includes(assetType);
  }
}
