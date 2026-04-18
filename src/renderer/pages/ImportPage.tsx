import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import type { PreviewTransactionItem } from '../../shared/contracts/preview-import.contract';
import { buildErrorMessage } from '../errors/build-error-message';

const SPREADSHEET_MODEL_COLUMNS = [
  { name: 'Data', type: 'texto (YYYY-MM-DD)', required: true },
  { name: 'Tipo', type: 'texto (Compra/Venda)', required: true },
  { name: 'Ticker', type: 'texto', required: true },
  { name: 'Quantidade', type: 'número', required: true },
  { name: 'Preço Unitário', type: 'número', required: true },
  { name: 'Taxas Totais', type: 'número', required: false },
  { name: 'Corretora', type: 'texto (código, ex: XP, CLEAR)', required: true },
] as const;

export function ImportPage(): JSX.Element {
  const [filePath, setFilePath] = useState('');
  const [brokers, setBrokers] = useState<
    Array<{ id: string; name: string; codigo: string }>
  >([]);
  const [isSelectingFile, setIsSelectingFile] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [previewTransactions, setPreviewTransactions] = useState<PreviewTransactionItem[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void window.electronApi.listBrokers({ activeOnly: true }).then((result) => {
      setBrokers(
        result.items.map((b) => ({ id: b.id, name: b.name, codigo: b.code })),
      );
    });
  }, []);

  const brokerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brokers) {
      map.set(b.id, b.name);
    }
    return map;
  }, [brokers]);

  async function handleSelectFile(): Promise<void> {
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

  async function handlePreviewImport(): Promise<void> {
    if (!filePath.trim()) return;
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

  async function handleConfirmImport(): Promise<void> {
    if (!filePath.trim()) {
      setErrorMessage('Selecione um arquivo primeiro.');
      return;
    }
    setIsConfirmLoading(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.confirmImportTransactions({ filePath });
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

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Importar transações (CSV/XLSX)</h2>
      <p className="mt-2 text-sm text-slate-600">
        Selecione um arquivo CSV ou Excel com o modelo de planilha abaixo. A corretora deve estar
        cadastrada.
      </p>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-slate-700">Modelo de planilha (colunas)</h3>
        <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Coluna</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Obrigatória</th>
                <th className="px-3 py-2">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {SPREADSHEET_MODEL_COLUMNS.map((col) => (
                <tr key={col.name} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{col.name}</td>
                  <td className="px-3 py-2">{col.type}</td>
                  <td className="px-3 py-2">{col.required ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {col.name === 'Data' && 'Data do pregão'}
                    {col.name === 'Tipo' && 'Compra ou Venda'}
                    {col.name === 'Ticker' && 'Código do ativo (ex: PETR4)'}
                    {col.name === 'Quantidade' && 'Quantidade negociada'}
                    {col.name === 'Preço Unitário' && 'Preço por unidade'}
                    {col.name === 'Taxas Totais' && 'Custos operacionais (default 0)'}
                    {col.name === 'Corretora' && 'Código da corretora (ex: XP, CLEAR)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-1">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Arquivo selecionado
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2"
              value={filePath}
              readOnly
              placeholder="Nenhum arquivo selecionado"
            />
            <button
              type="button"
              className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
              onClick={() => void handleSelectFile()}
              disabled={isSelectingFile}
            >
              {isSelectingFile ? 'Abrindo...' : 'Selecionar'}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => void handlePreviewImport()}
          disabled={isPreviewLoading || !filePath.trim()}
        >
          {isPreviewLoading ? 'Gerando conferência...' : 'Conferir arquivo'}
        </button>
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() => void handleConfirmImport()}
          disabled={isConfirmLoading || previewTransactions.length === 0}
        >
          {isConfirmLoading ? 'Confirmando...' : 'Confirmar importação'}
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

      {previewTransactions.length > 0 ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-700">
            Conferência pronta: {previewTransactions.length} transações.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Preço</th>
                  <th className="px-3 py-2">Taxas</th>
                  <th className="px-3 py-2">Corretora</th>
                </tr>
              </thead>
              <tbody>
                {previewTransactions.map((tx, index) => (
                  <tr key={`${tx.date}-${tx.ticker}-${index}`} className="border-t">
                    <td className="px-3 py-2">{tx.date}</td>
                    <td className="px-3 py-2">{tx.type}</td>
                    <td className="px-3 py-2">{tx.ticker}</td>
                    <td className="px-3 py-2">{tx.quantity}</td>
                    <td className="px-3 py-2">{tx.unitPrice}</td>
                    <td className="px-3 py-2">{tx.fees.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {brokerNameMap.get(tx.brokerId) ?? tx.brokerId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
