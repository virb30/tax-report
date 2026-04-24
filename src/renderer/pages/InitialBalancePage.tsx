import type { JSX } from 'react';
import { InitialBalanceForm } from './initial-balance-page/InitialBalanceForm';
import { InitialBalancePositionsTable } from './initial-balance-page/InitialBalancePositionsTable';
import { useInitialBalance } from './initial-balance-page/use-initial-balance';

export function InitialBalancePage(): JSX.Element {
  const initialBalance = useInitialBalance();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Saldo inicial</h2>
      <p className="mt-2 text-sm text-slate-600">
        Informe o saldo inicial de ativos já existentes na carteira (ex.: posições de anos
        anteriores).
      </p>

      <InitialBalanceForm
        assetType={initialBalance.assetType}
        averagePrice={initialBalance.averagePrice}
        brokerId={initialBalance.brokerId}
        brokers={initialBalance.brokers}
        canSave={initialBalance.canSave}
        isSaving={initialBalance.isSaving}
        onAssetTypeChange={initialBalance.setAssetType}
        onAveragePriceChange={initialBalance.setAveragePrice}
        onBrokerIdChange={initialBalance.setBrokerId}
        onQuantityChange={initialBalance.setQuantity}
        onSave={() => void initialBalance.saveInitialBalance()}
        onTickerChange={initialBalance.setTicker}
        onYearChange={initialBalance.setYear}
        quantity={initialBalance.quantity}
        ticker={initialBalance.ticker}
        year={initialBalance.year}
        yearOptions={initialBalance.yearOptions}
      />

      {initialBalance.feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {initialBalance.feedbackMessage}
        </p>
      ) : null}
      {initialBalance.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {initialBalance.errorMessage}
        </p>
      ) : null}

      <InitialBalancePositionsTable
        isLoading={initialBalance.isLoading}
        positions={initialBalance.positions}
        year={initialBalance.year}
      />
    </section>
  );
}
