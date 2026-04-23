import { useState } from 'react';
import type { JSX } from 'react';
import type { ConsolidatedPositionPreviewRow } from '../../shared/contracts/import-consolidated-position.contract';
import { buildErrorMessage } from '../errors/build-error-message';
import { buildYearOptions, getDefaultBaseYear } from '../../shared/utils/year';

const defaultBaseYear = getDefaultBaseYear();
const yearOptions = buildYearOptions(defaultBaseYear);

type ImportConsolidatedPositionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ImportConsolidatedPositionModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportConsolidatedPositionModalProps): JSX.Element {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [year, setYear] = useState(defaultBaseYear);
  const [previewRows, setPreviewRows] = useState<ConsolidatedPositionPreviewRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  async function handleSelectFile(): Promise<void> {
    setErrorMessage('');
    setFeedbackMessage('');
    setPreviewRows([]);
    try {
      const result = await window.electronApi.importSelectFile();
      if (result.filePath) {
        setFilePath(result.filePath);
        setIsLoadingPreview(true);
        try {
          const preview = await window.electronApi.previewConsolidatedPosition({
            filePath: result.filePath,
          });
          setPreviewRows(preview.rows);
        } catch (err) {
          setErrorMessage(buildErrorMessage(err));
          setFilePath(null);
        } finally {
          setIsLoadingPreview(false);
        }
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  async function handleConfirm(): Promise<void> {
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
      });
      setFeedbackMessage(
        `${result.importedCount} alocação(ões) importada(s). ${result.recalculatedTickers.length} ativo(s) recalculado(s).`,
      );
      onSuccess();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose(): void {
    setFilePath(null);
    setPreviewRows([]);
    setYear(defaultBaseYear);
    setErrorMessage('');
    setFeedbackMessage('');
    onClose();
  }

  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-consolidated-title"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="import-consolidated-title" className="text-lg font-semibold text-slate-800">
          Importar posição consolidada
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Selecione uma planilha (CSV/XLSX) com colunas Ticker, Quantidade, Preço Médio e Corretora
          (código). O ano é informado abaixo.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => void handleSelectFile()}
              disabled={isLoadingPreview}
            >
              {isLoadingPreview ? 'Carregando...' : 'Selecionar arquivo'}
            </button>
            {filePath ? (
              <span className="truncate text-sm text-slate-600">
                {filePath.split(/[/\\]/).pop() ?? filePath}
              </span>
            ) : null}
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Ano da posição
            <select
              className="w-32 rounded-md border border-slate-300 px-3 py-2"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>

          {previewRows.length > 0 ? (
            <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Ticker</th>
                    <th className="px-3 py-2">Quantidade</th>
                    <th className="px-3 py-2">Preço Médio</th>
                    <th className="px-3 py-2">Corretora</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-200">
                      <td className="px-3 py-1.5 font-medium">{row.ticker}</td>
                      <td className="px-3 py-1.5">{row.quantity.toFixed(2)}</td>
                      <td className="px-3 py-1.5">R$ {row.averagePrice.toFixed(2)}</td>
                      <td className="px-3 py-1.5">{row.brokerCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {previewRows.length} linha(s) — mesmo ticker+corretora: última linha prevalece
              </p>
            </div>
          ) : null}
        </div>

        {errorMessage.length > 0 ? (
          <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {errorMessage}
          </p>
        ) : null}
        {feedbackMessage.length > 0 ? (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {feedbackMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={handleClose}
          >
            Fechar
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            onClick={() => void handleConfirm()}
            disabled={isImporting || previewRows.length === 0}
          >
            {isImporting ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>
      </div>
    </div>
  );
}
