import { useState } from 'react';
import type { ConsolidatedPositionPreviewRow } from '../../../preload/contracts/ingestion/import-consolidated-position.contract';
import { buildYearOptions, getDefaultBaseYear } from '../../../shared/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';
import { unwrapIpcResult } from '../../ipc/unwrap-ipc-result';

const defaultBaseYear = getDefaultBaseYear();

type UseImportConsolidatedPositionModalParams = {
  onClose: () => void;
  onSuccess: () => void;
};

export function useImportConsolidatedPositionModal({
  onClose,
  onSuccess,
}: UseImportConsolidatedPositionModalParams) {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [year, setYear] = useState(defaultBaseYear);
  const [previewRows, setPreviewRows] = useState<ConsolidatedPositionPreviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function selectFile(): Promise<void> {
    setErrorMessage('');
    setFeedbackMessage('');
    setPreviewRows([]);

    try {
      const result = await window.electronApi.importSelectFile();
      if (!result.filePath) {
        return;
      }

      setFilePath(result.filePath);
      setIsLoadingPreview(true);
      try {
        const preview = await window.electronApi.previewConsolidatedPosition({
          filePath: result.filePath,
        });
        setPreviewRows(unwrapIpcResult(preview).rows);
      } catch (error: unknown) {
        setErrorMessage(buildErrorMessage(error));
        setFilePath(null);
      } finally {
        setIsLoadingPreview(false);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  async function confirmImport(): Promise<void> {
    if (!filePath) {
      setErrorMessage('Selecione um arquivo antes de confirmar.');
      return;
    }

    setIsImporting(true);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      const result = await window.electronApi.importConsolidatedPosition({
        filePath,
        year,
        assetTypeOverrides: [],
      });
      const data = unwrapIpcResult(result);
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
    setFilePath(null);
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
    fileName: filePath?.split(/[/\\]/).pop() ?? filePath,
    filePath,
    isImporting,
    isLoadingPreview,
    previewRows,
    selectFile,
    setYear,
    year,
    yearOptions: buildYearOptions(defaultBaseYear),
  };
}
