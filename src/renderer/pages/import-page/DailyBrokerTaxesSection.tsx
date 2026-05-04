import type { JSX } from 'react';
import type { Broker } from '../../types/broker.types';
import { useDailyBrokerTaxes } from './use-daily-broker-taxes';

type DailyBrokerTaxesSectionProps = {
  brokers: Broker[];
};

export function DailyBrokerTaxesSection({ brokers }: DailyBrokerTaxesSectionProps): JSX.Element {
  const dailyTaxes = useDailyBrokerTaxes(brokers);

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Taxas diárias</h3>
          <p className="mt-1 text-sm text-slate-600">
            Cadastre as taxas por data e corretora. A importação de operações usa esses valores no
            rateio por volume financeiro.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-60"
          onClick={() => void dailyTaxes.importTaxes()}
          disabled={dailyTaxes.isImporting}
        >
          {dailyTaxes.isImporting ? 'Importando...' : 'Importar planilha'}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Data
          <input
            type="date"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={dailyTaxes.form.date}
            onChange={(event) => dailyTaxes.updateForm('date', event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={dailyTaxes.form.brokerId}
            onChange={(event) => dailyTaxes.updateForm('brokerId', event.target.value)}
          >
            <option value="">Selecione</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.code} - {broker.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Taxas
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            inputMode="decimal"
            value={dailyTaxes.form.fees}
            onChange={(event) => dailyTaxes.updateForm('fees', event.target.value)}
            placeholder="0,00"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          IRRF
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            inputMode="decimal"
            value={dailyTaxes.form.irrf}
            onChange={(event) => dailyTaxes.updateForm('irrf', event.target.value)}
            placeholder="0,00"
          />
        </label>
      </div>

      <div className="mt-3">
        <button
          type="button"
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() => void dailyTaxes.saveTax()}
          disabled={dailyTaxes.isSaving || !dailyTaxes.form.date || !dailyTaxes.form.brokerId}
        >
          {dailyTaxes.isSaving ? 'Salvando...' : 'Salvar taxa diária'}
        </button>
      </div>

      {dailyTaxes.feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {dailyTaxes.feedbackMessage}
        </p>
      ) : null}
      {dailyTaxes.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {dailyTaxes.errorMessage}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Corretora</th>
              <th className="px-3 py-2">Taxas</th>
              <th className="px-3 py-2">IRRF</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {dailyTaxes.taxes.map((tax) => {
              const key = `${tax.date}::${tax.brokerId}`;
              return (
                <tr key={key} className="border-t border-slate-100">
                  <td className="px-3 py-2">{tax.date}</td>
                  <td className="px-3 py-2">
                    {tax.brokerCode} - {tax.brokerName}
                  </td>
                  <td className="px-3 py-2">{tax.fees.toFixed(2)}</td>
                  <td className="px-3 py-2">{tax.irrf.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      onClick={() => void dailyTaxes.deleteTax(tax)}
                      disabled={dailyTaxes.deletingKey === key}
                    >
                      {dailyTaxes.deletingKey === key ? 'Excluindo...' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {dailyTaxes.taxes.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={5}>
                  {dailyTaxes.isLoading ? 'Carregando taxas...' : 'Nenhuma taxa diária cadastrada.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
