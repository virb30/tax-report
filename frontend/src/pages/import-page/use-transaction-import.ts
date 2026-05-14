import { useEffect, useState } from 'react';
import type { PreviewTransactionItem } from '@/types/api.types';
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
  }

  async function previewImport(): Promise<void> {
    if (!selectedFile) {
      return;
    }

    setIsPreviewLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
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

    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await getTaxReportApi().confirmImportTransactions({
        file: selectedFile,
        assetTypeOverrides: [],
      });
      setFeedbackMessage(
        `Importação concluída: ${result.importedCount} transações importadas. Posições recalculadas: ${result.recalculatedTickers.join(', ') || 'nenhuma'}.`,
      );
      setPreviewTransactions([]);
      setSelectedFile(null);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsConfirmLoading(false);
    }
  }

  return {
    fileName: selectedFile?.name ?? '',
    hasSelectedFile: selectedFile !== null,
    brokers,
    isPreviewLoading,
    isConfirmLoading,
    previewTransactions,
    feedbackMessage,
    errorMessage,
    selectFile,
    previewImport,
    confirmImport,
  };
}
