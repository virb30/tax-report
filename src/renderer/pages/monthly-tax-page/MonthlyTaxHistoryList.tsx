import type { JSX } from 'react';
import type {
  MonthlyTaxCloseSummary,
  MonthlyTaxOutcome,
  MonthlyTaxWorkspaceState,
} from '../../../ipc/public';

type MonthlyTaxHistoryListProps = {
  months: MonthlyTaxCloseSummary[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
};

const stateLabels: Record<MonthlyTaxWorkspaceState, string> = {
  closed: 'Fechado',
  blocked: 'Bloqueado',
  obsolete: 'Desatualizado',
  needs_review: 'Revisar',
  below_threshold: 'Abaixo de R$ 10,00',
};

const stateStyles: Record<MonthlyTaxWorkspaceState, string> = {
  closed: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  blocked: 'border-rose-200 bg-rose-50 text-rose-800',
  obsolete: 'border-slate-300 bg-slate-100 text-slate-700',
  needs_review: 'border-amber-200 bg-amber-50 text-amber-800',
  below_threshold: 'border-sky-200 bg-sky-50 text-sky-800',
};

const outcomeLabels: Record<MonthlyTaxOutcome, string> = {
  no_tax: 'Sem imposto',
  exempt: 'Isento',
  tax_due: 'Imposto devido',
  below_threshold: 'Abaixo do minimo',
  blocked: 'Bloqueado',
};

export function MonthlyTaxHistoryList({
  months,
  selectedMonth,
  onSelectMonth,
}: MonthlyTaxHistoryListProps): JSX.Element {
  return (
    <div className="mt-6 grid gap-3">
      {months.map((month) => (
        <article
          key={month.month}
          className={`rounded-md border bg-white p-4 shadow-sm ${
            selectedMonth === month.month ? 'border-slate-900' : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{formatMonth(month.month)}</h3>
              <p className="mt-1 text-sm text-slate-600">
                Resultado: {outcomeLabels[month.outcome]}
              </p>
            </div>
            <span
              className={`rounded-md border px-3 py-1 text-sm font-medium ${stateStyles[month.state]}`}
            >
              {stateLabels[month.state]}
            </span>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => onSelectMonth(month.month)}
            >
              Ver detalhe de {formatMonth(month.month)}
            </button>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="font-medium text-slate-500">Imposto liquido</dt>
              <dd className="mt-1 text-slate-900">R$ {month.netTaxDue}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Carregado adiante</dt>
              <dd className="mt-1 text-slate-900">R$ {month.carryForwardOut}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500">Calculado em</dt>
              <dd className="mt-1 text-slate-900">{month.calculatedAt}</dd>
            </div>
          </dl>

          {month.changeSummary ? (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {month.changeSummary}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-');

  if (!year || !monthNumber) {
    return month;
  }

  return `${monthNumber}/${year}`;
}
