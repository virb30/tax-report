import { useMemo } from 'react';
import type { JSX } from 'react';
import { AssetType } from '@/types/api.types';
import type { PreviewTransactionItem } from '@/types/api.types';
import type { Broker } from '../../types/broker.types';

type TransactionsPreviewTableProps = {
  assetTypeOverrides: Record<string, AssetType>;
  brokers: Broker[];
  pendingReviewTickers: string[];
  previewTransactions: PreviewTransactionItem[];
  onAssetTypeOverrideChange: (ticker: string, assetType: string) => void;
};

function formatTransactionType(type: string | null): string {
  if (!type) {
    return 'Não suportada';
  }

  const map: Record<string, string> = {
    buy: 'Compra',
    sell: 'Venda',
    bonus: 'Bonificação',
    split: 'Desdobramento',
    reverse_split: 'Grupamento',
    transfer_in: 'Transf. Entrada',
    transfer_out: 'Transf. Saída',
  };
  return map[type] ?? type;
}

function formatAssetType(assetType: AssetType | null): string {
  const map: Record<AssetType, string> = {
    [AssetType.Stock]: 'Ações',
    [AssetType.Fii]: 'FII',
    [AssetType.Etf]: 'ETF',
    [AssetType.Bdr]: 'BDR',
  };

  return assetType ? map[assetType] : 'Pendente';
}

export function TransactionsPreviewTable({
  assetTypeOverrides,
  brokers,
  pendingReviewTickers,
  previewTransactions,
  onAssetTypeOverrideChange,
}: TransactionsPreviewTableProps): JSX.Element | null {
  const brokerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const broker of brokers) {
      map.set(broker.id, broker.name);
    }
    return map;
  }, [brokers]);

  if (previewTransactions.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-3">
      <p className="text-sm text-slate-700">
        Conferência pronta: {previewTransactions.length} transações.
      </p>
      {pendingReviewTickers.length > 0 ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Defina o tipo do ativo para confirmar a importação: {pendingReviewTickers.join(', ')}.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Ticker</th>
              <th className="px-3 py-2">Qtd</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Taxas</th>
              <th className="px-3 py-2">Corretora</th>
              <th className="px-3 py-2">Tipo do ativo</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {previewTransactions.map((transaction, index) => (
              <tr key={`${transaction.date}-${transaction.ticker}-${index}`} className="border-t">
                <td className="px-3 py-2">{transaction.date}</td>
                <td className="px-3 py-2">{formatTransactionType(transaction.type)}</td>
                <td className="px-3 py-2">{transaction.ticker}</td>
                <td className="px-3 py-2">{transaction.quantity}</td>
                <td className="px-3 py-2">{transaction.unitPrice}</td>
                <td className="px-3 py-2">{transaction.fees.toFixed(2)}</td>
                <td className="px-3 py-2">
                  {brokerNameMap.get(transaction.brokerId) ?? transaction.brokerId}
                </td>
                <td className="px-3 py-2">
                  {transaction.needsReview ? (
                    <label className="flex flex-col gap-1">
                      <span className="sr-only">{`Tipo do ativo para ${transaction.ticker}`}</span>
                      <select
                        aria-label={`Tipo do ativo para ${transaction.ticker}`}
                        className="min-w-32 rounded-md border border-amber-300 bg-white px-2 py-1"
                        value={assetTypeOverrides[transaction.ticker] ?? ''}
                        onChange={(event) =>
                          onAssetTypeOverrideChange(transaction.ticker, event.target.value)
                        }
                      >
                        <option value="">Selecione...</option>
                        <option value={AssetType.Stock}>Ações</option>
                        <option value={AssetType.Fii}>FII</option>
                        <option value={AssetType.Etf}>ETF</option>
                        <option value={AssetType.Bdr}>BDR</option>
                      </select>
                    </label>
                  ) : (
                    <span>{formatAssetType(transaction.resolvedAssetType)}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {transaction.needsReview ? (
                    <span className="font-medium text-amber-700">Requer revisão</span>
                  ) : transaction.unsupportedReason ? (
                    <span className="font-medium text-rose-700">Não suportada</span>
                  ) : (
                    <span className="text-emerald-700">Pronta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
