import { useState } from 'react';
import type { JSX } from 'react';
import { AssetType } from '../../shared/types/domain';
import type {
  AssetsReportAllocation,
  AssetsReportItem,
  GenerateAssetsReportResult,
} from '../../shared/contracts/assets-report.contract';
import { buildErrorMessage } from './build-error-message';

function formatBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  [AssetType.Stock]: 'Ações',
  [AssetType.Fii]: 'FIIs',
  [AssetType.Etf]: 'ETFs',
  [AssetType.Bdr]: 'BDRs',
};

function groupItemsByAssetType(items: AssetsReportItem[]): Map<AssetType, AssetsReportItem[]> {
  const groups = new Map<AssetType, AssetsReportItem[]>();
  const order: AssetType[] = [AssetType.Stock, AssetType.Fii, AssetType.Etf, AssetType.Bdr];

  for (const type of order) {
    const filtered = items.filter((i) => i.assetType === type);
    if (filtered.length > 0) {
      groups.set(type, filtered);
    }
  }

  return groups;
}

type TableRow = {
  ticker: string;
  assetType: AssetType;
  revenueClassification: { group: string; code: string };
  allocation: AssetsReportAllocation;
  averagePrice: number;
};

function flattenToRows(items: AssetsReportItem[]): TableRow[] {
  const rows: TableRow[] = [];

  for (const item of items) {
    for (const allocation of item.allocations) {
      rows.push({
        ticker: item.ticker,
        assetType: item.assetType,
        revenueClassification: item.revenueClassification,
        allocation,
        averagePrice: item.averagePrice,
      });
    }
  }

  return rows;
}

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
      setCopiedMessage('Não foi possível copiar automaticamente. Selecione e copie manualmente.');
    }
  }

  function handleCopyAll(): void {
    if (!report) return;
    const allDescriptions = report.items.flatMap((item) =>
      item.allocations.map((a) => a.description),
    );
    const text = allDescriptions.join('\n\n');
    void handleCopy('Todas as discriminações', text);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Relatório anual de bens e direitos</h2>
      <p className="mt-2 text-sm text-slate-600">
        Gere a posição de 31/12 e copie os campos para a declaração.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano-base
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={baseYear}
            onChange={(event) => setBaseYear(event.target.value)}
          >
            {Array.from({ length: 10 }, (_, i) => defaultBaseYear - i).map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void handleGenerateReport();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Gerando...' : 'Gerar Relatório'}
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
          <p className="text-sm text-slate-700">Data de referência: {report.referenceDate}</p>

          {report.items.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Nenhuma posição encontrada para o ano-base selecionado.
            </p>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  type="button"
                  className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
                  onClick={handleCopyAll}
                >
                  Copiar Tudo
                </button>
              </div>

              {Array.from(groupItemsByAssetType(report.items).entries()).map(
                ([assetType, items]) => (
                  <div key={assetType}>
                    <h3 className="mb-2 text-base font-medium text-slate-700">
                      {ASSET_TYPE_LABELS[assetType]}
                    </h3>
                    <div className="overflow-x-auto rounded-md border border-slate-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="px-3 py-2">Ticker</th>
                            <th className="px-3 py-2">Qtd</th>
                            <th className="px-3 py-2">PM (R$)</th>
                            <th className="px-3 py-2">Custo total (R$)</th>
                            <th className="px-3 py-2">Corretora</th>
                            <th className="px-3 py-2">Grupo/Código</th>
                            <th className="px-3 py-2">Discriminação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {flattenToRows(items).map((row, idx) => (
                            <tr
                              key={`${row.ticker}-${row.allocation.brokerId}-${idx}`}
                              className="border-t align-top"
                            >
                              <td className="px-3 py-2">{row.ticker}</td>
                              <td className="px-3 py-2">{row.allocation.quantity}</td>
                              <td className="px-3 py-2">R$ {formatBrl(row.averagePrice)}</td>
                              <td className="px-3 py-2">
                                R$ {formatBrl(row.allocation.totalCost)}
                              </td>
                              <td className="px-3 py-2">{row.allocation.brokerName}</td>
                              <td className="px-3 py-2">
                                {row.revenueClassification.group}/{row.revenueClassification.code}
                              </td>
                              <td className="space-y-2 px-3 py-2">
                                <p className="max-w-xl whitespace-pre-wrap">
                                  {row.allocation.description}
                                </p>
                                <button
                                  type="button"
                                  className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-300"
                                  onClick={() => {
                                    void handleCopy(
                                      `Discriminação de ${row.ticker} - ${row.allocation.brokerName}`,
                                      row.allocation.description,
                                    );
                                  }}
                                >
                                  Copiar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
