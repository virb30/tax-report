import type { JSX } from 'react';
import { AssetType } from '@/types/api.types';
import type { Broker } from '../../types/broker.types';
import type { InitialBalanceAllocationDraft } from './use-initial-balance';

type InitialBalanceFormProps = {
  allocations: InitialBalanceAllocationDraft[];
  assetType: AssetType;
  averagePrice: string;
  brokers: Broker[];
  canRemoveAllocation: boolean;
  canSave: boolean;
  issuerCnpj: string;
  issuerName: string;
  isEditing: boolean;
  isSaving: boolean;
  onAddAllocation: () => void;
  onAllocationBrokerIdChange: (allocationId: string, brokerId: string) => void;
  onAllocationQuantityChange: (allocationId: string, quantity: string) => void;
  onAssetTypeChange: (value: AssetType) => void;
  onAveragePriceChange: (value: string) => void;
  onCancelEdit: () => void;
  onIssuerCnpjChange: (value: string) => void;
  onIssuerNameChange: (value: string) => void;
  onRemoveAllocation: (allocationId: string) => void;
  onSave: () => void;
  onTickerChange: (value: string) => void;
  onYearChange: (value: number) => void;
  ticker: string;
  year: number;
  yearOptions: number[];
};

export function InitialBalanceForm({
  allocations,
  assetType,
  averagePrice,
  brokers,
  canRemoveAllocation,
  canSave,
  issuerCnpj,
  issuerName,
  isEditing,
  isSaving,
  onAddAllocation,
  onAllocationBrokerIdChange,
  onAllocationQuantityChange,
  onAssetTypeChange,
  onAveragePriceChange,
  onCancelEdit,
  onIssuerCnpjChange,
  onIssuerNameChange,
  onRemoveAllocation,
  onSave,
  onTickerChange,
  onYearChange,
  ticker,
  year,
  yearOptions,
}: InitialBalanceFormProps): JSX.Element {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            {isEditing ? 'Editar documento' : 'Novo documento'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Um documento agrupa todas as corretoras do mesmo ticker no ano selecionado.
          </p>
        </div>
        {isEditing ? (
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onCancelEdit}
          >
            Cancelar edição
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano de referência (saldo em 01/01)
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
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
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={ticker}
            onChange={(event) => onTickerChange(event.target.value.toUpperCase())}
            placeholder="Ex: PETR4"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tipo de ativo
          <select
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
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
          Nome do emissor
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={issuerName}
            onChange={(event) => onIssuerNameChange(event.target.value)}
            placeholder="Ex: Petrobras"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          CNPJ
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={issuerCnpj}
            onChange={(event) => onIssuerCnpjChange(event.target.value)}
            placeholder="Ex: 33.000.167/0001-01"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Preço médio global (R$)
          <input
            type="number"
            step="0.01"
            min="0"
            className="rounded-md border border-slate-300 bg-white px-3 py-2"
            value={averagePrice}
            onChange={(event) => onAveragePriceChange(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            Alocações por corretora
          </h4>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onAddAllocation}
          >
            Adicionar alocação
          </button>
        </div>

        <div className="mt-3 space-y-3">
          {allocations.map((allocation, index) => (
            <div
              key={allocation.id}
              className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_auto]"
            >
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Corretora {index + 1}
                <select
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={allocation.brokerId}
                  onChange={(event) =>
                    onAllocationBrokerIdChange(allocation.id, event.target.value)
                  }
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
                Quantidade
                <input
                  type="number"
                  step="any"
                  min="0"
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={allocation.quantity}
                  onChange={(event) =>
                    onAllocationQuantityChange(allocation.id, event.target.value)
                  }
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  className="rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => onRemoveAllocation(allocation.id)}
                  disabled={!canRemoveAllocation}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={onSave}
          disabled={!canSave}
        >
          {isSaving
            ? 'Salvando...'
            : isEditing
              ? 'Atualizar saldo inicial'
              : 'Salvar saldo inicial'}
        </button>
      </div>
    </div>
  );
}
