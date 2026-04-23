import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { AssetType } from '../../shared/types/domain';
import type { ListPositionsResult } from '../../shared/contracts/list-positions.contract';
import { buildErrorMessage } from '../errors/build-error-message';
import { listActiveBrokers } from '../services/api/list-brokers';
import type { Broker } from '../types/broker.types';
import { buildYearOptions, getDefaultBaseYear } from '../../shared/utils/year';

const defaultBaseYear = getDefaultBaseYear();
const yearOptions = buildYearOptions(defaultBaseYear);

export function InitialBalancePage(): JSX.Element {
  const [year, setYear] = useState(defaultBaseYear);
  const [ticker, setTicker] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Stock);
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [positions, setPositions] = useState<ListPositionsResult['items']>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function loadBrokers(): Promise<void> {
    try {
      const brokers = await listActiveBrokers();
      setBrokers(brokers);
      if (brokers.length > 0 && !brokerId) {
        setBrokerId(brokers[0].id);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  async function loadPositions(): Promise<void> {
    setIsLoading(true);
    try {
      const result = await window.electronApi.listPositions({ baseYear: year });
      setPositions(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBrokers();
  }, []);

  useEffect(() => {
    void loadPositions();
  }, [year]);

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    const qty = Number(quantity);
    const avg = Number(averagePrice);
    if (Number.isNaN(qty) || qty <= 0) {
      setErrorMessage('Quantidade deve ser maior que zero.');
      setIsSaving(false);
      return;
    }
    if (Number.isNaN(avg) || avg <= 0) {
      setErrorMessage('Preço médio deve ser maior que zero.');
      setIsSaving(false);
      return;
    }
    if (!brokerId) {
      setErrorMessage('Selecione uma corretora.');
      setIsSaving(false);
      return;
    }
    try {
      await window.electronApi.setInitialBalance({
        ticker: ticker.toUpperCase().trim(),
        brokerId,
        assetType,
        quantity: qty,
        averagePrice: avg,
        year,
      });
      setFeedbackMessage('Saldo inicial cadastrado com sucesso.');
      setTicker('');
      setQuantity('');
      setAveragePrice('');
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Saldo inicial</h2>
      <p className="mt-2 text-sm text-slate-600">
        Informe o saldo inicial de ativos já existentes na carteira (ex.: posições de anos
        anteriores).
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ano de referência (saldo em 01/01)
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ticker
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
            placeholder="Ex: PETR4"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={brokerId}
            onChange={(event) => setBrokerId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {brokers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tipo de ativo
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={assetType}
            onChange={(event) => setAssetType(event.target.value as AssetType)}
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
            onChange={(event) => setQuantity(event.target.value)}
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
            onChange={(event) => setAveragePrice(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => void handleSave()}
          disabled={
            isSaving ||
            ticker.trim().length === 0 ||
            !brokerId ||
            quantity.trim().length === 0 ||
            averagePrice.trim().length === 0
          }
        >
          {isSaving ? 'Salvando...' : 'Salvar saldo inicial'}
        </button>
      </div>

      {feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {feedbackMessage}
        </p>
      ) : null}
      {errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-800">Posições em 31/12/{year}</h3>
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
                {positions.map((p) => (
                  <tr key={p.ticker} className="border-t">
                    <td className="px-3 py-2">{p.ticker}</td>
                    <td className="px-3 py-2">{p.assetType}</td>
                    <td className="px-3 py-2">{p.totalQuantity.toFixed(2)}</td>
                    <td className="px-3 py-2">R$ {p.averagePrice.toFixed(2)}</td>
                    <td className="px-3 py-2">R$ {p.totalCost.toFixed(2)}</td>
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
    </section>
  );
}
