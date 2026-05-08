import type { JSX } from 'react';
import type { MonthlyTaxGroupCode, MonthlyTaxSaleLine } from '../../../ipc/public';

type MonthlyTaxSaleLinesTableProps = {
  saleLines: MonthlyTaxSaleLine[];
};

export function MonthlyTaxSaleLinesTable({
  saleLines,
}: MonthlyTaxSaleLinesTableProps): JSX.Element {
  if (saleLines.length === 0) {
    return <></>;
  }

  return (
    <section className="mt-5 overflow-x-auto">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Linhas de venda
      </h4>
      <table className="mt-3 min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-white text-left text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Ticker</th>
            <th className="px-3 py-2 font-medium">Grupo</th>
            <th className="px-3 py-2 font-medium">Quantidade</th>
            <th className="px-3 py-2 font-medium">Bruto</th>
            <th className="px-3 py-2 font-medium">Resultado</th>
            <th className="px-3 py-2 font-medium">IRRF</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {saleLines.map((line) => (
            <tr key={line.id}>
              <td className="px-3 py-2 text-slate-700">{line.date}</td>
              <td className="px-3 py-2 font-medium text-slate-900">{line.ticker}</td>
              <td className="px-3 py-2 text-slate-700">{groupLabel(line.groupCode)}</td>
              <td className="px-3 py-2 text-slate-700">{line.quantity}</td>
              <td className="px-3 py-2 text-slate-700">{formatCurrency(line.grossAmount)}</td>
              <td className="px-3 py-2 text-slate-700">{formatCurrency(line.realizedResult)}</td>
              <td className="px-3 py-2 text-slate-700">{formatCurrency(line.allocatedIrrf)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function formatCurrency(value: string): string {
  return `R$ ${value}`;
}

function groupLabel(code: MonthlyTaxGroupCode): string {
  const labels: Record<MonthlyTaxGroupCode, string> = {
    'geral-comum': 'Geral - Comum',
    'geral-isento': 'Geral - Isento',
    fii: 'FII',
  };

  return labels[code];
}
