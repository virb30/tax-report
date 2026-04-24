import type { JSX } from 'react';
import { AssetType } from '../../../shared/types/domain';
import type { Broker } from '../../types/broker.types';

type InitialBalanceFormProps = {
  assetType: AssetType;
  averagePrice: string;
  brokerId: string;
  brokers: Broker[];
  canSave: boolean;
  isSaving: boolean;
  onAssetTypeChange: (value: AssetType) => void;
  onAveragePriceChange: (value: string) => void;
  onBrokerIdChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onSave: () => void;
  onTickerChange: (value: string) => void;
  onYearChange: (value: number) => void;
  quantity: string;
  ticker: string;
  year: number;
  yearOptions: number[];
};

export function InitialBalanceForm({
  assetType,
  averagePrice,
  brokerId,
  brokers,
  canSave,
  isSaving,
  onAssetTypeChange,
  onAveragePriceChange,
  onBrokerIdChange,
  onQuantityChange,
  onSave,
  onTickerChange,
  onYearChange,
  quantity,
  ticker,
  year,
  yearOptions,
}: InitialBalanceFormProps): JSX.Element {
  return (
    <>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano de referência (saldo em 01/01)
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={year}
            onChange={(event) => onYearChange(Number(event.target.value))}
          >
            {yearOptions.map((optionYear) => (
              <option key={optionYear} value={optionYear}>
                {optionYear}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ticker
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={ticker}
            onChange={(event) => onTickerChange(event.target.value.toUpperCase())}
            placeholder="Ex: PETR4"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={brokerId}
            onChange={(event) => onBrokerIdChange(event.target.value)}
          >
            <option value="">Selecione...</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tipo de ativo
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={assetType}
            onChange={(event) => onAssetTypeChange(event.target.value as AssetType)}
          >
            <option value={AssetType.Stock}>Ações</option>
            <option value={AssetType.Fii}>FII</option>
            <option value={AssetType.Etf}>ETF</option>
            <option value={AssetType.Bdr}>BDR</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Quantidade
          <input
            type="number"
            step="any"
            min="0"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={quantity}
            onChange={(event) => onQuantityChange(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Preço médio (R$)
          <input
            type="number"
            step="0.01"
            min="0"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={averagePrice}
            onChange={(event) => onAveragePriceChange(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={onSave}
          disabled={!canSave}
        >
          {isSaving ? 'Salvando...' : 'Salvar saldo inicial'}
        </button>
      </div>
    </>
  );
}
