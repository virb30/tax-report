import { Fragment, useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { ListPositionsResult, PositionListItem } from '../../shared/contracts/list-positions.contract';
import { buildErrorMessage } from './build-error-message';
import { MigrateYearModal } from './MigrateYearModal';

const defaultBaseYear = new Date().getFullYear() - 1;

export function PositionsPage(): JSX.Element {
  const [baseYear, setBaseYear] = useState(defaultBaseYear);
  const [positions, setPositions] = useState<PositionListItem[]>([]);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recalculatingTicker, setRecalculatingTicker] = useState<string | null>(null);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [migrateModalOpen, setMigrateModalOpen] = useState(false);

  async function loadPositions(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result: ListPositionsResult = await window.electronApi.listPositions({ baseYear });
      setPositions(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, [baseYear]);

  async function handleRecalculate(ticker: string): Promise<void> {
    setRecalculatingTicker(ticker);
    setErrorMessage('');
    try {
      await window.electronApi.recalculatePosition({ ticker });
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setRecalculatingTicker(null);
    }
  }

  async function handleRecalculateAll(): Promise<void> {
    setRecalculatingAll(true);
    setErrorMessage('');
    try {
      for (const p of positions) {
        await window.electronApi.recalculatePosition({ ticker: p.ticker });
      }
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setRecalculatingAll(false);
    }
  }

  function toggleExpand(ticker: string): void {
    setExpandedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Posições consolidadas</h2>
          <p className="mt-2 text-sm text-slate-600">
            Posição em 31/12/{baseYear}. Selecione o ano para filtrar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            Ano:
            <select
              className="rounded-md border border-slate-300 px-2 py-1.5"
              value={baseYear}
              onChange={(event) => setBaseYear(Number(event.target.value))}
            >
              {Array.from({ length: 15 }, (_, i) => defaultBaseYear - 5 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            onClick={() => setMigrateModalOpen(true)}
          >
            Migrar posições entre anos
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={() => void handleRecalculateAll()}
            disabled={recalculatingAll || positions.length === 0}
          >
            {recalculatingAll ? 'Recalculando...' : 'Recalcular todas'}
          </button>
        </div>
      </div>

      <MigrateYearModal
        isOpen={migrateModalOpen}
        onClose={() => setMigrateModalOpen(false)}
        onSuccess={(targetYear) => {
          if (targetYear != null) {
            setBaseYear(targetYear);
          } else {
            void loadPositions();
          }
        }}
      />

      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-md border border-slate-200">
        {isLoading ? (
          <p className="p-6 text-sm text-slate-600">Carregando posições...</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="w-8 px-3 py-2"></th>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Qtd total</th>
                <th className="px-3 py-2">PM global</th>
                <th className="px-3 py-2">Custo total</th>
                <th className="w-24 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <Fragment key={p.ticker}>
                  <tr
                    key={p.ticker}
                    className="cursor-pointer border-t hover:bg-slate-50"
                    onClick={() => toggleExpand(p.ticker)}
                  >
                    <td className="px-3 py-2">
                      {p.brokerBreakdown.length > 0 ? (
                        <span className="inline-block w-4">
                          {expandedTickers.has(p.ticker) ? '▼' : '▶'}
                        </span>
                      ) : (
                        <span className="inline-block w-4" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{p.ticker}</td>
                    <td className="px-3 py-2">{p.assetType}</td>
                    <td className="px-3 py-2">{p.totalQuantity.toFixed(2)}</td>
                    <td className="px-3 py-2">R$ {p.averagePrice.toFixed(2)}</td>
                    <td className="px-3 py-2">R$ {p.totalCost.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRecalculate(p.ticker);
                        }}
                        disabled={recalculatingTicker === p.ticker || recalculatingAll}
                      >
                        {recalculatingTicker === p.ticker ? '...' : 'Recalcular'}
                      </button>
                    </td>
                  </tr>
                  {expandedTickers.has(p.ticker) && p.brokerBreakdown.length > 0 ? (
                    <tr key={`${p.ticker}-detail`} className="border-t bg-slate-50">
                      <td colSpan={7} className="px-3 py-2">
                        <div className="ml-6 rounded border border-slate-200 bg-white p-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                            Por corretora
                          </h4>
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="border-b text-slate-600">
                                <th className="py-1 text-left">Corretora</th>
                                <th className="py-1 text-left">CNPJ</th>
                                <th className="py-1 text-right">Quantidade</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.brokerBreakdown.map((b) => (
                                <tr key={b.brokerId} className="border-b last:border-0">
                                  <td className="py-1">{b.brokerName}</td>
                                  <td className="py-1 font-mono text-xs">{b.brokerCnpj}</td>
                                  <td className="py-1 text-right">{b.quantity.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {positions.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={7}>
                    Nenhuma posição cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
