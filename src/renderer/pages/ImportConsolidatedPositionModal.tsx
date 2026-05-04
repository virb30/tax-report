import type { JSX } from 'react';
import { useImportConsolidatedPositionModal } from './import-consolidated-position-modal/use-import-consolidated-position-modal';

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
  const modal = useImportConsolidatedPositionModal({ onClose, onSuccess });

  if (!isOpen) {
    return <></>;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={modal.close}
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
              onClick={() => void modal.selectFile()}
              disabled={modal.isLoadingPreview}
            >
              {modal.isLoadingPreview ? 'Carregando...' : 'Selecionar arquivo'}
            </button>
            {modal.fileName ? (
              <span className="truncate text-sm text-slate-600">{modal.fileName}</span>
            ) : null}
          </div>

          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Ano da posição
            <select
              className="w-32 rounded-md border border-slate-300 px-3 py-2"
              value={modal.year}
              onChange={(event) => modal.setYear(Number(event.target.value))}
            >
              {modal.yearOptions.map((yearOption) => (
                <option key={yearOption} value={yearOption}>
                  {yearOption}
                </option>
              ))}
            </select>
          </label>

          {modal.previewRows.length > 0 ? (
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
                  {modal.previewRows.map((row, idx) => (
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
                {modal.previewRows.length} linha(s) — mesmo ticker+corretora: última linha prevalece
              </p>
            </div>
          ) : null}
        </div>

        {modal.errorMessage.length > 0 ? (
          <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {modal.errorMessage}
          </p>
        ) : null}
        {modal.feedbackMessage.length > 0 ? (
          <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {modal.feedbackMessage}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={modal.close}
          >
            Fechar
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            onClick={() => void modal.confirmImport()}
            disabled={modal.isImporting || modal.previewRows.length === 0}
          >
            {modal.isImporting ? 'Importando...' : 'Confirmar importação'}
          </button>
        </div>
      </div>
    </div>
  );
}
