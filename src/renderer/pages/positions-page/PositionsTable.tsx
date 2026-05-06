import { Fragment } from 'react';
import type { JSX } from 'react';
import type { PositionListItem } from '../../../ipc/public';

type PositionsTableProps = {
  deletingTicker: string | null;
  expandedTickers: Set<string>;
  isLoading: boolean;
  onDeletePosition: (ticker: string) => void;
  onRecalculatePosition: (ticker: string) => void;
  onToggleExpand: (ticker: string) => void;
  positions: PositionListItem[];
  recalculatingAll: boolean;
  recalculatingTicker: string | null;
};

export function PositionsTable({
  deletingTicker,
  expandedTickers,
  isLoading,
  onDeletePosition,
  onRecalculatePosition,
  onToggleExpand,
  positions,
  recalculatingAll,
  recalculatingTicker,
}: PositionsTableProps): JSX.Element {
  return (
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
              <th className="w-32 px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <Fragment key={position.ticker}>
                <tr
                  className="cursor-pointer border-t hover:bg-slate-50"
                  onClick={() => onToggleExpand(position.ticker)}
                >
                  <td className="px-3 py-2">
                    {position.brokerBreakdown.length > 0 ? (
                      <span className="inline-block w-4">
                        {expandedTickers.has(position.ticker) ? '▼' : '▶'}
                      </span>
                    ) : (
                      <span className="inline-block w-4" />
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{position.ticker}</td>
                  <td className="px-3 py-2">{position.assetType}</td>
                  <td className="px-3 py-2">{Number(position.totalQuantity)?.toFixed(2)}</td>
                  <td className="px-3 py-2">R$ {Number(position.averagePrice)?.toFixed(2)}</td>
                  <td className="px-3 py-2">R$ {Number(position.totalCost)?.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRecalculatePosition(position.ticker);
                        }}
                        disabled={recalculatingTicker === position.ticker || recalculatingAll}
                      >
                        {recalculatingTicker === position.ticker ? '...' : 'Recalcular'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-rose-300 bg-white px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeletePosition(position.ticker);
                        }}
                        disabled={deletingTicker === position.ticker || recalculatingAll}
                      >
                        {deletingTicker === position.ticker ? '...' : 'Excluir'}
                      </button>
                    </div>
                  </td>
                </tr>
                {expandedTickers.has(position.ticker) && position.brokerBreakdown.length > 0 ? (
                  <tr className="border-t bg-slate-50">
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
                            {position.brokerBreakdown.map((brokerBreakdown) => (
                              <tr key={brokerBreakdown.brokerId} className="border-b last:border-0">
                                <td className="py-1">{brokerBreakdown.brokerName}</td>
                                <td className="py-1 font-mono text-xs">
                                  {brokerBreakdown.brokerCnpj}
                                </td>
                                <td className="py-1 text-right">
                                  {Number(brokerBreakdown.quantity).toFixed(2)}
                                </td>
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
  );
}
