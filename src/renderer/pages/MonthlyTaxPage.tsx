import type { JSX } from 'react';
import { MonthlyTaxDetailPanel } from './monthly-tax-page/MonthlyTaxDetailPanel';
import { MonthlyTaxHistoryList } from './monthly-tax-page/MonthlyTaxHistoryList';
import {
  type MonthlyTaxRepairNavigation,
  useMonthlyTaxPage,
} from './monthly-tax-page/use-monthly-tax-page';

export type { MonthlyTaxRepairNavigation };

type MonthlyTaxPageProps = {
  onRepairNavigate?: (navigation: MonthlyTaxRepairNavigation) => void;
};

export function MonthlyTaxPage({ onRepairNavigate }: MonthlyTaxPageProps = {}): JSX.Element {
  const monthlyTaxPage = useMonthlyTaxPage({ onRepairNavigate });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Imposto mensal</h2>
          <p className="mt-2 text-sm text-slate-600">
            Revise o historico importado por mes e priorize meses bloqueados, desatualizados ou
            abaixo do minimo de recolhimento.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void monthlyTaxPage.reloadWorkspace();
          }}
          disabled={monthlyTaxPage.isHistoryLoading || monthlyTaxPage.isDetailLoading}
        >
          {monthlyTaxPage.isHistoryLoading ? 'Carregando...' : 'Atualizar'}
        </button>
      </div>

      {monthlyTaxPage.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {monthlyTaxPage.errorMessage}
        </p>
      ) : null}

      {monthlyTaxPage.isHistoryLoading ? (
        <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          Carregando historico mensal...
        </p>
      ) : null}

      {!monthlyTaxPage.isHistoryLoading &&
      monthlyTaxPage.errorMessage.length === 0 &&
      monthlyTaxPage.months.length === 0 ? (
        <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
          Nenhum historico mensal encontrado. Importe transacoes para iniciar o fechamento mensal.
        </p>
      ) : null}

      {!monthlyTaxPage.isHistoryLoading && monthlyTaxPage.months.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <MonthlyTaxHistoryList
            months={monthlyTaxPage.months}
            selectedMonth={monthlyTaxPage.selectedMonth}
            onSelectMonth={(month) => {
              void monthlyTaxPage.selectMonth(month);
            }}
          />

          <div className="mt-6">
            {monthlyTaxPage.isDetailLoading ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                Carregando detalhe mensal...
              </p>
            ) : null}

            {monthlyTaxPage.detailErrorMessage.length > 0 ? (
              <p className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {monthlyTaxPage.detailErrorMessage}
              </p>
            ) : null}

            {!monthlyTaxPage.isDetailLoading &&
            monthlyTaxPage.detailErrorMessage.length === 0 &&
            monthlyTaxPage.detail === null ? (
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600">
                Selecione um mes para inspecionar o detalhe auditavel.
              </p>
            ) : null}

            {!monthlyTaxPage.isDetailLoading && monthlyTaxPage.detail !== null ? (
              <MonthlyTaxDetailPanel
                detail={monthlyTaxPage.detail}
                onFollowRepair={monthlyTaxPage.followRepairTarget}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
