import { useState } from 'react';
import type { JSX } from 'react';
import { buildErrorMessage } from '../errors/build-error-message';
import { unwrapIpcResult } from '../../ipc/public';
import { assertSupportedYear, buildYearOptions, getDefaultBaseYear } from '../../shared/utils/year';

const defaultBaseYear = getDefaultBaseYear();
const yearOptions = buildYearOptions(defaultBaseYear);

type MigrateYearModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (targetYear?: number) => void;
};

export function MigrateYearModal({
  isOpen,
  onClose,
  onSuccess,
}: MigrateYearModalProps): JSX.Element {
  const [sourceYear, setSourceYear] = useState(String(defaultBaseYear - 1));
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  const sourceYearNum = Number(sourceYear);
  const targetYear = Number.isInteger(sourceYearNum) ? sourceYearNum + 1 : sourceYearNum + 1;

  async function handleMigrate(): Promise<void> {
    const year = Number(sourceYear);
    try {
      assertSupportedYear(year, { invalidTypeMessage: 'Ano de origem inválido.' });
    } catch {
      setErrorMessage('Ano de origem inválido.');
      return;
    }

    setIsMigrating(true);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      const result = unwrapIpcResult(
        await window.electronApi.migrateYear({
          sourceYear: year,
          targetYear: year + 1,
        }),
      );

      if (result.message) {
        setFeedbackMessage(result.message);
      } else {
        setFeedbackMessage(
          `Migração concluída: ${result.migratedPositionsCount} posição(ões) migrada(s), ${result.createdTransactionsCount} transação(ões) criada(s).`,
        );
      }
      onSuccess(year + 1);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsMigrating(false);
    }
  }

  function handleClose(): void {
    setErrorMessage('');
    setFeedbackMessage('');
    setSourceYear(String(defaultBaseYear - 1));
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
      aria-labelledby="migrate-year-title"
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="migrate-year-title" className="text-lg font-semibold text-slate-800">
          Migrar posições entre anos
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Cria transações de Saldo Inicial no ano destino com as posições em 31/12 do ano de origem.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Ano de origem (posição em 31/12)
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              value={sourceYear}
              onChange={(e) => setSourceYear(e.target.value)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Ano destino: <strong>{targetYear}</strong> (01/01)
          </div>
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
            onClick={() => void handleMigrate()}
            disabled={isMigrating}
          >
            {isMigrating ? 'Migrando...' : 'Migrar posições'}
          </button>
        </div>
      </div>
    </div>
  );
}
