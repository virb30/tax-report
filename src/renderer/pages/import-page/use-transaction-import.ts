import { useEffect, useState } from 'react';
import type { PreviewTransactionItem } from '../../../preload/contracts/ingestion/preview-import.contract';
import { buildErrorMessage } from '../../errors/build-error-message';
import { listActiveBrokers } from '../../services/api/list-brokers';
import type { Broker } from '../../types/broker.types';

export function useTransactionImport() {
  const [filePath, setFilePath] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
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

  async function selectFile(): Promise<void> {
    setIsSelectingFile(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.importSelectFile();
      if (result.filePath) {
        setFilePath(result.filePath);
        setPreviewTransactions([]);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSelectingFile(false);
    }
  }

  async function previewImport(): Promise<void> {
    if (!filePath.trim()) {
      return;
    }

    setIsPreviewLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const previewResult = await window.electronApi.previewImportTransactions({ filePath });
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
    if (!filePath.trim()) {
      setErrorMessage('Selecione um arquivo primeiro.');
      return;
    }

    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.confirmImportTransactions({
        filePath,
        assetTypeOverrides: [],
      });
      setFeedbackMessage(
        `Importação concluída: ${result.importedCount} transações importadas. Posições recalculadas: ${result.recalculatedTickers.join(', ') || 'nenhuma'}.`,
      );
      setPreviewTransactions([]);
      setFilePath('');
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsConfirmLoading(false);
    }
  }

  return {
    filePath,
    brokers,
    isSelectingFile,
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
