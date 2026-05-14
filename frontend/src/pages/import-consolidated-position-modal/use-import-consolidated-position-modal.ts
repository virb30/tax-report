import { useState } from 'react';
import { unwrapApiResult } from '@/services/api/api-result';
import { getTaxReportApi } from '@/services/api/tax-report-api-provider';
import type { ConsolidatedPositionPreviewRow } from '@/types/api.types';
import { buildYearOptions, getDefaultBaseYear } from '@/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';

const defaultBaseYear = getDefaultBaseYear();

type UseImportConsolidatedPositionModalParams = {
  onClose: () => void;
  onSuccess: () => void;
};

export function useImportConsolidatedPositionModal({
  onClose,
  onSuccess,
}: UseImportConsolidatedPositionModalParams) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [year, setYear] = useState(defaultBaseYear);
  const [previewRows, setPreviewRows] = useState<ConsolidatedPositionPreviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function selectFile(file: File | null): Promise<void> {
    setErrorMessage('');
    setFeedbackMessage('');
    setPreviewRows([]);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsLoadingPreview(true);
    try {
      const preview = await getTaxReportApi().previewConsolidatedPosition({
        file,
      });
      setPreviewRows(unwrapApiResult(preview).rows);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
      setSelectedFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function confirmImport(): Promise<void> {
    if (!selectedFile) {
      setErrorMessage('Selecione um arquivo antes de confirmar.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      const result = await getTaxReportApi().importConsolidatedPosition({
        file: selectedFile,
        year,
        assetTypeOverrides: [],
      });
      const data = unwrapApiResult(result);
      setFeedbackMessage(
        `${data.importedCount} alocação(ões) importada(s). ${data.recalculatedTickers.length} ativo(s) recalculado(s).`,
      );
      onSuccess();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  function close(): void {
    setSelectedFile(null);
    setPreviewRows([]);
    setYear(defaultBaseYear);
    setErrorMessage('');
    setFeedbackMessage('');
    onClose();
  }

  return {
    close,
    confirmImport,
    defaultBaseYear,
    errorMessage,
    feedbackMessage,
    fileName: selectedFile?.name ?? '',
    hasSelectedFile: selectedFile !== null,
    isImporting,
    isLoadingPreview,
    previewRows,
    selectFile,
    setYear,
    year,
    yearOptions: buildYearOptions(defaultBaseYear),
  };
}
