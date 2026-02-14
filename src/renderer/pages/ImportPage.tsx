import { useMemo, useState } from 'react';
import type { JSX } from 'react';
import type { ImportOperationsCommand } from '../../shared/contracts/import-operations.contract';
import { buildErrorMessage } from './build-error-message';

export function ImportPage(): JSX.Element {
  const [broker, setBroker] = useState('XP');
  const [filePath, setFilePath] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [previewCommands, setPreviewCommands] = useState<ImportOperationsCommand[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const previewSummary = useMemo(() => {
    let operationCount = 0;
    for (const command of previewCommands) {
      operationCount += command.operations.length;
    }
    return {
      commandCount: previewCommands.length,
      operationCount,
    };
  }, [previewCommands]);

  async function handlePreviewImport(): Promise<void> {
    setIsPreviewLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const previewResult = await window.electronApi.previewImportFromFile({
        broker,
        filePath,
      });
      setPreviewCommands(previewResult.commands);
      setFeedbackMessage('Conferencia gerada. Revise os dados e confirme a importacao.');
    } catch (error: unknown) {
      setPreviewCommands([]);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (previewCommands.length === 0) {
      setErrorMessage('Nenhuma operacao em conferencia para confirmar.');
      return;
    }
    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.confirmImportOperations({
        commands: previewCommands,
      });
      setFeedbackMessage(
        `Importacao concluida: ${result.createdOperationsCount} operacoes criadas e ${result.recalculatedPositionsCount} posicoes recalculadas.`,
      );
      setPreviewCommands([]);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsConfirmLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Importar arquivo com conferencia</h2>
      <p className="mt-2 text-sm text-slate-600">
        Informe a corretora e o caminho do arquivo CSV/XLSX para revisar antes de confirmar.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={broker}
            onChange={(event) => setBroker(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Caminho do arquivo
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={filePath}
            onChange={(event) => setFilePath(event.target.value)}
            placeholder="/caminho/arquivo.csv"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handlePreviewImport();
          }}
          disabled={isPreviewLoading || filePath.trim().length === 0}
        >
          {isPreviewLoading ? 'Gerando conferencia...' : 'Conferir arquivo'}
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() => {
            void handleConfirmImport();
          }}
          disabled={isConfirmLoading || previewCommands.length === 0}
        >
          {isConfirmLoading ? 'Confirmando...' : 'Confirmar importacao'}
        </button>
      </div>

      {feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedbackMessage}
        </p>
      ) : null}
      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      {previewCommands.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-700">
            Conferencia pronta: {previewSummary.commandCount} notas e {previewSummary.operationCount}{' '}
            operacoes.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Preco</th>
                </tr>
              </thead>
              <tbody>
                {previewCommands.flatMap((command) =>
                  command.operations.map((operation, index) => (
                    <tr key={`${command.tradeDate}-${operation.ticker}-${index}`} className="border-t">
                      <td className="px-3 py-2">{command.tradeDate}</td>
                      <td className="px-3 py-2">{operation.ticker}</td>
                      <td className="px-3 py-2">{operation.operationType}</td>
                      <td className="px-3 py-2">{operation.quantity}</td>
                      <td className="px-3 py-2">{operation.unitPrice}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
