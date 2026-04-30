import type { JSX } from 'react';
import type { InitialBalanceDocument } from '../../../shared/contracts/initial-balance.contract';
import type { Broker } from '../../types/broker.types';

type InitialBalanceDocumentsTableProps = {
  brokers: Broker[];
  deletingDocumentKey: string | null;
  documents: InitialBalanceDocument[];
  isLoading: boolean;
  onDelete: (document: InitialBalanceDocument) => void;
  onEdit: (document: InitialBalanceDocument) => void;
  year: number;
};

function toDocumentKey(document: InitialBalanceDocument): string {
  return `${document.ticker}:${document.year}`;
}

export function InitialBalanceDocumentsTable({
  brokers,
  deletingDocumentKey,
  documents,
  isLoading,
  onDelete,
  onEdit,
  year,
}: InitialBalanceDocumentsTableProps): JSX.Element {
  const brokerNameById = new Map(brokers.map((broker) => [broker.id, broker.name]));

  return (
    <div className="mt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            Documentos salvos de saldo inicial
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Cada linha representa um documento por ticker no ano {year}.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Carregando documentos...</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Ticker</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Qtd total</th>
                <th className="px-3 py-2">PM global</th>
                <th className="px-3 py-2">Alocações</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const documentKey = toDocumentKey(document);

                return (
                  <tr key={documentKey} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{document.ticker}</td>
                    <td className="px-3 py-2">{document.assetType}</td>
                    <td className="px-3 py-2">{Number(document.totalQuantity).toFixed(2)}</td>
                    <td className="px-3 py-2">R$ {Number(document.averagePrice).toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <ul className="space-y-1">
                        {document.allocations.map((allocation) => (
                          <li key={`${documentKey}:${allocation.brokerId}`}>
                            {brokerNameById.get(allocation.brokerId) ?? allocation.brokerId}:{' '}
                            {Number(allocation.quantity).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={() => onEdit(document)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => onDelete(document)}
                          disabled={deletingDocumentKey === documentKey}
                        >
                          {deletingDocumentKey === documentKey ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {documents.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    Nenhum documento de saldo inicial salvo para {year}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
