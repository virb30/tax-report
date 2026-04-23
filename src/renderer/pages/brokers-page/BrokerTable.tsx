import type { JSX } from 'react';
import type { Broker } from '../../types/broker.types';

type BrokerTableProps = {
  brokers: Broker[];
  isLoading: boolean;
  togglingId: string | null;
  onEdit: (broker: Broker) => void;
  onToggleActive: (broker: Broker) => void;
};

export function BrokerTable({
  brokers,
  isLoading,
  togglingId,
  onEdit,
  onToggleActive,
}: BrokerTableProps): JSX.Element {
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-slate-800">Corretoras cadastradas</h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-600">Carregando...</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2">Codigo</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">CNPJ</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {brokers.map((broker) => (
                <tr key={broker.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{broker.code}</td>
                  <td className="px-3 py-2">{broker.name}</td>
                  <td className="px-3 py-2">{broker.cnpj}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        broker.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {broker.active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                        onClick={() => onEdit(broker)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-60"
                        onClick={() => onToggleActive(broker)}
                        disabled={togglingId === broker.id}
                      >
                        {togglingId === broker.id ? '...' : broker.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {brokers.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    Nenhuma corretora cadastrada.
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
