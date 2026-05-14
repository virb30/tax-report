import { useEffect, useState } from 'react';
import { AssetType } from '@/types/api.types';
import type { AssetTypeOverrideDecision, PreviewTransactionItem } from '@/types/api.types';
import { buildErrorMessage } from '../../errors/build-error-message';
import { getTaxReportApi } from '../../services/api/tax-report-api-provider';
import { listActiveBrokers } from '../../services/api/list-brokers';
import type { Broker } from '../../types/broker.types';

export function useTransactionImport() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransactionItem[]>([]);
  const [assetTypeOverrides, setAssetTypeOverrides] = useState<Record<string, AssetType>>({});
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadBrokers();
  }, []);

  async function loadBrokers(): Promise<void> {
    try {
      setBrokers(await listActiveBrokers());
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  function selectFile(file: File | null): void {
    setErrorMessage('');
    setFeedbackMessage('');
    setSelectedFile(file);
    setPreviewTransactions([]);
    setAssetTypeOverrides({});
  }

  async function previewImport(): Promise<void> {
    if (!selectedFile) {
      return;
    }

    setIsPreviewLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    setAssetTypeOverrides({});
    try {
      const previewResult = await getTaxReportApi().previewImportTransactions({
        file: selectedFile,
      });
      setPreviewTransactions(previewResult.transactionsPreview);
      setFeedbackMessage('Conferência gerada. Revise os dados e confirme a importação.');
    } catch (error: unknown) {
      setPreviewTransactions([]);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function confirmImport(): Promise<void> {
    if (!selectedFile) {
      setErrorMessage('Selecione um arquivo primeiro.');
      return;
    }

    const pendingReviewTickers = getPendingReviewTickers(previewTransactions);
    const missingOverrideTickers = pendingReviewTickers.filter(
      (ticker) => assetTypeOverrides[ticker] === undefined,
    );

    if (missingOverrideTickers.length > 0) {
      setErrorMessage(
        `Defina o tipo do ativo antes de confirmar: ${missingOverrideTickers.join(', ')}.`,
      );
      return;
    }

    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await getTaxReportApi().confirmImportTransactions({
        file: selectedFile,
        assetTypeOverrides: buildAssetTypeOverrides(assetTypeOverrides, pendingReviewTickers),
      });
      setFeedbackMessage(
        `Importação concluída: ${result.importedCount} transações importadas. Posições recalculadas: ${result.recalculatedTickers.join(', ') || 'nenhuma'}.`,
      );
      setPreviewTransactions([]);
      setAssetTypeOverrides({});
      setSelectedFile(null);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsConfirmLoading(false);
    }
  }

  const pendingReviewTickers = getPendingReviewTickers(previewTransactions);

  function setAssetTypeOverride(ticker: string, assetTypeValue: string): void {
    setAssetTypeOverrides((currentOverrides) => {
      if (assetTypeValue.length === 0) {
        const nextOverrides = { ...currentOverrides };
        delete nextOverrides[ticker];
        return nextOverrides;
      }

      if (!isAssetType(assetTypeValue)) {
        return currentOverrides;
      }

      return {
        ...currentOverrides,
        [ticker]: assetTypeValue,
      };
    });
  }

  return {
    assetTypeOverrides,
    canConfirmImport:
      previewTransactions.length > 0 &&
      pendingReviewTickers.every((ticker) => assetTypeOverrides[ticker] !== undefined),
    fileName: selectedFile?.name ?? '',
    hasSelectedFile: selectedFile !== null,
    brokers,
    hasPendingReview: pendingReviewTickers.length > 0,
    isPreviewLoading,
    isConfirmLoading,
    pendingReviewTickers,
    previewTransactions,
    feedbackMessage,
    errorMessage,
    selectFile,
    setAssetTypeOverride,
    previewImport,
    confirmImport,
  };
}

function getPendingReviewTickers(previewTransactions: PreviewTransactionItem[]): string[] {
  return [...new Set(previewTransactions.filter((item) => item.needsReview).map((item) => item.ticker))];
}

function buildAssetTypeOverrides(
  overrides: Record<string, AssetType>,
  pendingReviewTickers: string[],
): AssetTypeOverrideDecision[] {
  return pendingReviewTickers.flatMap((ticker) => {
    const assetType = overrides[ticker];
    if (assetType === undefined) {
      return [];
    }

    return [{ ticker, assetType }];
  });
}

function isAssetType(value: string): value is AssetType {
  return Object.values(AssetType).includes(value as AssetType);
}
