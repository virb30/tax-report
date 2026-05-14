import { useState, useEffect, useCallback } from 'react';
import type { AssetCatalogItem, ListAssetsQuery } from '@/types/api.types';
import type { AssetType } from '@/types/api.types';
import { buildErrorMessage } from '../../errors/build-error-message';
import { getTaxReportApi } from '../../services/api/tax-report-api-provider';

export function useAssetCatalog() {
  const [assets, setAssets] = useState<AssetCatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [editingAsset, setEditingAsset] = useState<AssetCatalogItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAssets = useCallback(async (query?: ListAssetsQuery) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await getTaxReportApi().listAssets(query);
      setAssets(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAssets();
  }, [fetchAssets]);

  const openEditModal = (asset: AssetCatalogItem) => {
    setEditingAsset(asset);
    setFeedbackMessage('');
    setErrorMessage('');
  };

  const closeEditModal = () => {
    setEditingAsset(null);
  };

  const saveAsset = async (
    ticker: string,
    data: { name?: string; cnpj?: string; assetType?: AssetType },
  ) => {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      if (data.assetType && data.assetType !== editingAsset?.assetType) {
        // Repair flow
        const repairResult = await getTaxReportApi().repairAssetType({
          ticker,
          assetType: data.assetType,
        });
        if (repairResult.success) {
          setFeedbackMessage(
            `Ativo ${ticker} reparado com sucesso. ${repairResult.repair.reprocessedCount} anos reprocessados.`,
          );
        } else {
          setErrorMessage(repairResult.error);
        }
      }

      // Metadata update flow (always run to ensure name/cnpj are saved)
      const updateResult = await getTaxReportApi().updateAsset({
        ticker,
        ...data,
      });

      if (updateResult.success) {
        if (!feedbackMessage) {
          setFeedbackMessage(`Ativo ${ticker} atualizado com sucesso.`);
        }
        await fetchAssets();
        closeEditModal();
      } else {
        setErrorMessage(updateResult.error);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return {
    assets,
    isLoading,
    errorMessage,
    feedbackMessage,
    editingAsset,
    isSaving,
    openEditModal,
    closeEditModal,
    saveAsset,
    refresh: fetchAssets,
  };
}
