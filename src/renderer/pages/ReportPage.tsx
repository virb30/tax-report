import { useState } from 'react';
import type { JSX } from 'react';
import type { GenerateAssetsReportResult } from '../../shared/contracts/assets-report.contract';
import { buildErrorMessage } from './build-error-message';

export function ReportPage(): JSX.Element {
  const defaultBaseYear = new Date().getFullYear() - 1;
  const [baseYear, setBaseYear] = useState(String(defaultBaseYear));
  const [report, setReport] = useState<GenerateAssetsReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedMessage, setCopiedMessage] = useState('');

  async function handleGenerateReport(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    setCopiedMessage('');
    try {
      const result = await window.electronApi.generateAssetsReport({
        baseYear: Number(baseYear),
      });
      setReport(result);
    } catch (error: unknown) {
      setReport(null);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy(label: string, content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessage(`${label} copiado com sucesso.`);
    } catch {
      setCopiedMessage('Nao foi possivel copiar automaticamente. Selecione e copie manualmente.');
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Relatorio anual de bens e direitos</h2>
      <p className="mt-2 text-sm text-slate-600">
        Gere a posicao de 31/12 e copie os campos para a declaracao.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano-base
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={baseYear}
            onChange={(event) => setBaseYear(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handleGenerateReport();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Gerando...' : 'Gerar relatorio'}
        </button>
      </div>

      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}
      {copiedMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {copiedMessage}
        </p>
      ) : null}

      {report ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-slate-700">Data de referencia: {report.referenceDate}</p>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Qtd</th>
                  <th className="px-3 py-2">Preco medio</th>
                  <th className="px-3 py-2">Total</th>
                  <th className="px-3 py-2">Grupo/Codigo</th>
                  <th className="px-3 py-2">Discriminacao</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={`${item.ticker}-${item.broker}`} className="border-t align-top">
                    <td className="px-3 py-2">{item.ticker}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.averagePrice.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.totalCost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {item.revenueClassification.group}/{item.revenueClassification.code}
                    </td>
                    <td className="space-y-2 px-3 py-2">
                      <p className="max-w-xl whitespace-pre-wrap">{item.description}</p>
                      <button
                        type="button"
                        className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
                        onClick={() => {
                          void handleCopy(`Discriminacao de ${item.ticker}`, item.description);
                        }}
                      >
                        Copiar discriminacao
                      </button>
                    </td>
                  </tr>
                ))}
                {report.items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={6}>
                      Nenhum ativo em carteira para o ano-base selecionado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
