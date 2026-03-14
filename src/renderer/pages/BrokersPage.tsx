import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { buildErrorMessage } from '../errors/build-error-message';
import type { Broker } from '../types/broker.types';
import { listBrokers } from '../services/api/list-brokers';

export function BrokersPage(): JSX.Element {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCnpj, setEditCnpj] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadBrokers(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const brokers = await listBrokers();
      setBrokers(brokers);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBrokers();
  }, []);

  function openEditModal(broker: Broker): void {
    setEditingBroker(broker);
    setEditName(broker.name);
    setEditCode(broker.code);
    setEditCnpj(broker.cnpj);
    setErrorMessage('');
  }

  function closeEditModal(): void {
    setEditingBroker(null);
    setEditName('');
    setEditCode('');
    setEditCnpj('');
  }

  async function handleCreateBroker(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.createBroker({ name, code, cnpj });
      if (result.success) {
        setFeedbackMessage('Corretora cadastrada com sucesso.');
        setName('');
        setCode('');
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

  async function handleUpdateBroker(): Promise<void> {
    if (!editingBroker) return;
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.updateBroker({
        id: editingBroker.id,
        name: editName,
        code: editCode,
        cnpj: editCnpj,
      });
      if (result.success) {
        setFeedbackMessage('Corretora atualizada com sucesso.');
        closeEditModal();
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

  async function handleToggleActive(broker: Broker): Promise<void> {
    setTogglingId(broker.id);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await window.electronApi.toggleBrokerActive({ id: broker.id });
      if (result.success) {
        setFeedbackMessage(
          result.broker.active ? 'Corretora ativada.' : 'Corretora desativada.',
        );
        await loadBrokers();
      } else {
        setErrorMessage(result.error);
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Gerenciar corretoras</h2>
      <p className="mt-2 text-sm text-slate-600">
        Cadastre e consulte as corretoras de valores para uso em transacoes e relatorios fiscais.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Codigo
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Ex: XP"
          />
        </label>
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
          disabled={isSaving || name.trim().length === 0 || code.trim().length === 0 || cnpj.trim().length === 0}
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
                          broker.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
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
                          onClick={() => openEditModal(broker)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-60"
                          onClick={() => void handleToggleActive(broker)}
                          disabled={togglingId === broker.id}
                        >
                          {togglingId === broker.id
                            ? '...'
                            : broker.active
                              ? 'Desativar'
                              : 'Ativar'}
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

      {editingBroker ? (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-broker-title"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
            <h2 id="edit-broker-title" className="text-lg font-semibold text-slate-800">
              Editar corretora
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Codigo
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  placeholder="Ex: XP"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Nome
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ex: Minha Corretora"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                CNPJ
                <input
                  className="rounded-md border border-slate-300 px-3 py-2"
                  value={editCnpj}
                  onChange={(e) => setEditCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                onClick={closeEditModal}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
                onClick={() => void handleUpdateBroker()}
                disabled={
                  isSaving || editName.trim().length === 0 || editCode.trim().length === 0 || editCnpj.trim().length === 0
                }
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
