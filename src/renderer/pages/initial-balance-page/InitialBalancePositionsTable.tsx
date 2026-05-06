import type { JSX } from 'react';
import type { PositionListItem } from '../../../ipc/public';

type InitialBalancePositionsTableProps = {
  isLoading: boolean;
  positions: PositionListItem[];
  year: number;
};

export function InitialBalancePositionsTable({
  isLoading,
  positions,
  year,
}: InitialBalancePositionsTableProps): JSX.Element {
  return (
    <div className="mt-8 border-t border-slate-200 pt-6">
      <h3 className="text-base font-semibold text-slate-800">Posições em 31/12/{year}</h3>
      <p className="mt-1 text-sm text-slate-600">
        Esta tabela mostra a posição consolidada do ano, separada dos documentos editáveis acima.
      </p>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Qtd total</th>
                <th className="px-3 py-2">PM global</th>
                <th className="px-3 py-2">Custo total</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.ticker} className="border-t">
                  <td className="px-3 py-2">{position.ticker}</td>
                  <td className="px-3 py-2">{position.assetType}</td>
                  <td className="px-3 py-2">{Number(position.totalQuantity)?.toFixed(2)}</td>
                  <td className="px-3 py-2">R$ {Number(position.averagePrice)?.toFixed(2)}</td>
                  <td className="px-3 py-2">R$ {Number(position.totalCost)?.toFixed(2)}</td>
                </tr>
              ))}
              {positions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    Nenhuma posição em 31/12/{year}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
