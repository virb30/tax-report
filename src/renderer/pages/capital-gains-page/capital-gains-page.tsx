import type { JSX } from 'react';
import { useCapitalGainsPage } from './use-capital-gains-page';
import {
  CapitalGainsAssessmentStatus,
  CapitalGainsAssetCategory,
} from '../../../shared/types/domain';
import type { GenerateCapitalGainsAssessmentResult } from '../../../preload/contracts/tax-reporting/capital-gains-assessment.contract';

type CapitalGainsMonth = GenerateCapitalGainsAssessmentResult['months'][number];
type CapitalGainsCategory =
  GenerateCapitalGainsAssessmentResult['annualTotals']['categories'][number];
type SaleTrace = CapitalGainsMonth['saleTraces'][number];
type AssessmentBlocker = CapitalGainsMonth['blockers'][number];

const categoryLabels: Record<CapitalGainsAssetCategory, string> = {
  [CapitalGainsAssetCategory.Stock]: 'Ações',
  [CapitalGainsAssetCategory.Fii]: 'FIIs',
  [CapitalGainsAssetCategory.Etf]: 'ETFs',
};

function calculateProfit(category: CapitalGainsCategory): number {
  return category.taxableGain + category.exemptGain + category.compensatedLoss;
}

export function CapitalGainsPage(): JSX.Element {
  const {
    baseYear,
    setBaseYear,
    yearOptions,
    assessment,
    isLoading,
    errorMessage,
    generateAssessment,
    expandedMonths,
    toggleMonthExpansion,
  } = useCapitalGainsPage();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">
        Apuração de Ganhos de Capital (Renda Variável)
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Consulte os totais mensais, realize a compensação de prejuízos e identifique bloqueadores
        para sua declaração.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano-base
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={baseYear}
            onChange={(event) => setBaseYear(event.target.value)}
          >
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => {
            void generateAssessment();
          }}
          disabled={isLoading}
        >
          {isLoading ? 'Gerando...' : 'Gerar Apuração'}
        </button>
      </div>

      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      {assessment ? (
        <div className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-md bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs text-slate-500 font-medium uppercase">Vendas Totais</p>
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(assessment.annualTotals.saleProceeds)}
              </p>
            </div>
            <div className="rounded-md bg-emerald-50 p-4 border border-emerald-100">
              <p className="text-xs text-emerald-700 font-medium uppercase">Ganho Tributável</p>
              <p className="text-lg font-bold text-emerald-900">
                {formatCurrency(assessment.annualTotals.taxableGain)}
              </p>
            </div>
            <div className="rounded-md bg-sky-50 p-4 border border-sky-100">
              <p className="text-xs text-sky-700 font-medium uppercase">Ganho Isento (Ações)</p>
              <p className="text-lg font-bold text-sky-900">
                {formatCurrency(assessment.annualTotals.exemptStockGain)}
              </p>
            </div>
            <div className="rounded-md bg-rose-50 p-4 border border-rose-100">
              <p className="text-xs text-rose-700 font-medium uppercase">Prejuízo a Compensar</p>
              <p className="text-lg font-bold text-rose-900">
                {formatCurrency(assessment.annualTotals.remainingLossBalance)}
              </p>
            </div>
          </div>

          <CategorySummaryTable
            title="Consolidado por tipo de ativo"
            categories={assessment.annualTotals.categories}
            formatCurrency={formatCurrency}
          />

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Mês
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Vendas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Resultado Líquido
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                    Detalhes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {assessment.months.map((month) => (
                  <MonthRow
                    key={month.month}
                    month={month}
                    isExpanded={expandedMonths.has(month.month)}
                    onToggle={() => toggleMonthExpansion(month.month)}
                    formatCurrency={formatCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CategorySummaryTable({
  title,
  categories,
  formatCurrency,
}: {
  title: string;
  categories: CapitalGainsCategory[];
  formatCurrency: (value: number) => string;
}): JSX.Element {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-white">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Tipo
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Total de vendas
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Lucro
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Prejuízo
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {categories.map((category) => (
            <tr key={category.category}>
              <td className="px-4 py-3 text-sm font-medium text-slate-800">
                {categoryLabels[category.category]}
              </td>
              <td className="px-4 py-3 text-right text-sm text-slate-700">
                {formatCurrency(category.saleProceeds)}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700">
                {formatCurrency(calculateProfit(category))}
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-rose-700">
                {formatCurrency(category.loss)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MonthRow({
  month,
  isExpanded,
  onToggle,
  formatCurrency,
}: {
  month: CapitalGainsMonth;
  isExpanded: boolean;
  onToggle: () => void;
  formatCurrency: (value: number) => string;
}): JSX.Element {
  const statusColors = {
    [CapitalGainsAssessmentStatus.Ready]: 'bg-emerald-100 text-emerald-800',
    [CapitalGainsAssessmentStatus.Pending]: 'bg-amber-100 text-amber-800',
    [CapitalGainsAssessmentStatus.Unsupported]: 'bg-slate-100 text-slate-800',
    [CapitalGainsAssessmentStatus.Mixed]: 'bg-indigo-100 text-indigo-800',
  };

  const statusLabels = {
    [CapitalGainsAssessmentStatus.Ready]: 'Pronto',
    [CapitalGainsAssessmentStatus.Pending]: 'Pendente',
    [CapitalGainsAssessmentStatus.Unsupported]: 'Não Suportado',
    [CapitalGainsAssessmentStatus.Mixed]: 'Misto',
  };

  const totalSaleProceeds = month.categories.reduce(
    (accumulator, category) => accumulator + category.saleProceeds,
    0,
  );
  const totalNetResult = month.categories.reduce(
    (accumulator, category) => accumulator + calculateProfit(category) - category.loss,
    0,
  );

  return (
    <>
      <tr className={isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}>
        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-900">
          {month.month}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-sm">
          <span
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[month.status as CapitalGainsAssessmentStatus] || 'bg-slate-100 text-slate-800'}`}
          >
            {statusLabels[month.status as CapitalGainsAssessmentStatus] || month.status}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-600">
          {formatCurrency(totalSaleProceeds)}
        </td>
        <td
          className={`whitespace-nowrap px-4 py-4 text-right text-sm font-medium ${totalNetResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {formatCurrency(totalNetResult)}
        </td>
        <td className="whitespace-nowrap px-4 py-4 text-center text-sm">
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-600">
            {isExpanded ? 'Recolher' : 'Detalhes'}
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-slate-50 px-4 py-4">
            <div className="space-y-4">
              <CategorySummaryTable
                title={`Resultado mensal por tipo - ${month.month}`}
                categories={month.categories}
                formatCurrency={formatCurrency}
              />

              {month.blockers.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                  <h4 className="text-xs font-bold uppercase text-amber-800">Bloqueadores</h4>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-700">
                    {month.blockers.map((blocker: AssessmentBlocker) => (
                      <li
                        key={`${blocker.sourceTransactionId ?? blocker.code}-${blocker.ticker ?? ''}`}
                      >
                        {blocker.message} {blocker.ticker ? `(${blocker.ticker})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {month.saleTraces.length > 0 ? (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-500">Trilha de Vendas</h4>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="pb-2 font-medium">Data</th>
                          <th className="pb-2 font-medium">Ativo</th>
                          <th className="pb-2 font-medium text-right">Venda</th>
                          <th className="pb-2 font-medium text-right">Custo</th>
                          <th className="pb-2 font-medium text-right">Grosso</th>
                          <th className="pb-2 font-medium text-right">Compensado</th>
                          <th className="pb-2 font-medium">Classificação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {month.saleTraces.map((trace: SaleTrace) => (
                          <tr key={trace.sourceTransactionId}>
                            <td className="py-2">{trace.date}</td>
                            <td className="py-2 font-medium">{trace.ticker}</td>
                            <td className="py-2 text-right">
                              {formatCurrency(trace.saleProceeds)}
                            </td>
                            <td className="py-2 text-right">
                              {formatCurrency(trace.acquisitionCostBasis)}
                            </td>
                            <td
                              className={`py-2 text-right font-medium ${trace.grossResult >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                            >
                              {formatCurrency(trace.grossResult)}
                            </td>
                            <td className="py-2 text-right">
                              {formatCurrency(trace.compensatedLossAmount)}
                            </td>
                            <td className="py-2">{trace.classification}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Nenhuma venda realizada neste mês.</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
