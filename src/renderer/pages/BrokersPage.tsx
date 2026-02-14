import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import type { BrokerListItem, ListBrokersResult } from '../../shared/contracts/brokers.contract';
import { buildErrorMessage } from './build-error-message';

export function BrokersPage(): JSX.Element {
  const [brokers, setBrokers] = useState<BrokerListItem[]>([]);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function loadBrokers(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result: ListBrokersResult = await window.electronApi.listBrokers();
      setBrokers(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBrokers();
  }, []);

  async function handleCreateBroker(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.createBroker({ name, cnpj });
      if (result.success) {
        setFeedbackMessage('Corretora cadastrada com sucesso.');
        setName('');
        setCnpj('');
        await loadBrokers();
      } else {
        setErrorMessage(result.error);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Gerenciar corretoras</h2>
      <p className="mt-2 text-sm text-slate-600">
        Cadastre e consulte as corretoras de valores para uso em transacoes e relatorios fiscais.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Nome
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Minha Corretora"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          CNPJ
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={cnpj}
            onChange={(event) => setCnpj(event.target.value)}
            placeholder="00.000.000/0001-00"
          />
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          onClick={() => void handleCreateBroker()}
          disabled={isSaving || name.trim().length === 0 || cnpj.trim().length === 0}
        >
          {isSaving ? 'Cadastrando...' : 'Cadastrar corretora'}
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
        <h3 className="text-base font-semibold text-slate-800">Corretoras cadastradas</h3>
        {isLoading ? (
          <p className="mt-2 text-sm text-slate-600">Carregando...</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">CNPJ</th>
                </tr>
              </thead>
              <tbody>
                {brokers.map((broker) => (
                  <tr key={broker.id} className="border-t">
                    <td className="px-3 py-2">{broker.name}</td>
                    <td className="px-3 py-2">{broker.cnpj}</td>
                  </tr>
                ))}
                {brokers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={2}>
                      Nenhuma corretora cadastrada.
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
