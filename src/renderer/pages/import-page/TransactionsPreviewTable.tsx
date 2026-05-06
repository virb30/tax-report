import { useMemo } from 'react';
import type { JSX } from 'react';
import type { PreviewTransactionItem } from '../../../ipc/public';
import type { Broker } from '../../types/broker.types';

type TransactionsPreviewTableProps = {
  brokers: Broker[];
  previewTransactions: PreviewTransactionItem[];
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

export function TransactionsPreviewTable({
  brokers,
  previewTransactions,
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
