import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { AssetType } from '../../shared/types/domain';
import type { ListPositionsResult } from '../../shared/contracts/list-positions.contract';
import { buildErrorMessage } from './build-error-message';

export function ManualBasePage(): JSX.Element {
  const [ticker, setTicker] = useState('');
  const [broker, setBroker] = useState('XP');
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Stock);
  const [quantity, setQuantity] = useState('0');
  const [averagePrice, setAveragePrice] = useState('0');
  const [positions, setPositions] = useState<ListPositionsResult['items']>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  async function loadPositions(): Promise<void> {
    setIsLoadingPositions(true);
    try {
      const result = await window.electronApi.listPositions();
      setPositions(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoadingPositions(false);
    }
  }

  useEffect(() => {
    void loadPositions();
  }, []);

  async function handleSaveManualBase(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      await window.electronApi.setManualBase({
        ticker,
        broker,
        assetType,
        quantity: Number(quantity),
        averagePrice: Number(averagePrice),
      });
      setFeedbackMessage('Base manual salva com sucesso.');
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Gerenciar base manual</h2>
      <p className="mt-2 text-sm text-slate-600">
        Defina quantidade e preco medio para ativos ja existentes na carteira.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Ticker
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={ticker}
            onChange={(event) => setTicker(event.target.value.toUpperCase())}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Corretora
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={broker}
            onChange={(event) => setBroker(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Tipo de ativo
          <select
            className="rounded-md border border-slate-300 px-3 py-2"
            value={assetType}
            onChange={(event) => setAssetType(event.target.value as AssetType)}
          >
            <option value={AssetType.Stock}>Acoes</option>
            <option value={AssetType.Fii}>FII</option>
            <option value={AssetType.Etf}>ETF</option>
            <option value={AssetType.Bdr}>BDR</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Quantidade
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700 md:col-span-2">
          Preco medio
          <input
            type="number"
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
          onClick={() => {
            void handleSaveManualBase();
          }}
          disabled={isSaving || ticker.trim().length === 0}
        >
          {isSaving ? 'Salvando...' : 'Salvar base manual'}
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
        <h3 className="text-base font-semibold text-slate-800">Posicoes atuais</h3>
        {isLoadingPositions ? <p className="mt-2 text-sm text-slate-600">Carregando...</p> : null}
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Corretora</th>
                <th className="px-3 py-2">Qtd</th>
                <th className="px-3 py-2">Preco medio</th>
                <th className="px-3 py-2">Custo total</th>
                <th className="px-3 py-2">Origem</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={`${position.ticker}-${position.broker}`} className="border-t">
                  <td className="px-3 py-2">{position.ticker}</td>
                  <td className="px-3 py-2">{position.broker}</td>
                  <td className="px-3 py-2">{position.quantity}</td>
                  <td className="px-3 py-2">{position.averagePrice.toFixed(2)}</td>
                  <td className="px-3 py-2">{position.totalCost.toFixed(2)}</td>
                  <td className="px-3 py-2">{position.isManualBase ? 'Manual' : 'Importacao'}</td>
                </tr>
              ))}
              {positions.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    Nenhuma posicao cadastrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
