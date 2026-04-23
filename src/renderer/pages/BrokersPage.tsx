import type { JSX } from 'react';
import { BrokerForm } from './brokers-page/BrokerForm';
import { BrokerTable } from './brokers-page/BrokerTable';
import { EditBrokerModal } from './brokers-page/EditBrokerModal';
import { useBrokerManagement } from './brokers-page/use-broker-management';

export function BrokersPage(): JSX.Element {
  const brokerManagement = useBrokerManagement();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">Gerenciar corretoras</h2>
      <p className="mt-2 text-sm text-slate-600">
        Cadastre e consulte as corretoras de valores para uso em transacoes e relatorios fiscais.
      </p>

      <BrokerForm
        title="Cadastrar corretora"
        submitLabel="Cadastrar corretora"
        isSubmitting={brokerManagement.isSaving}
        values={brokerManagement.createValues}
        onChange={brokerManagement.updateCreateValue}
        onSubmit={() => void brokerManagement.createBroker()}
      />

      {brokerManagement.feedbackMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {brokerManagement.feedbackMessage}
        </p>
      ) : null}
      {brokerManagement.errorMessage.length > 0 ? (
        <p className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {brokerManagement.errorMessage}
        </p>
      ) : null}

      <BrokerTable
        brokers={brokerManagement.brokers}
        isLoading={brokerManagement.isLoading}
        togglingId={brokerManagement.togglingId}
        onEdit={brokerManagement.openEditModal}
        onToggleActive={(broker) => void brokerManagement.toggleBrokerActive(broker)}
      />

      <EditBrokerModal
        broker={brokerManagement.editingBroker}
        isSaving={brokerManagement.isSaving}
        values={brokerManagement.editValues}
        onChange={brokerManagement.updateEditValue}
        onClose={brokerManagement.closeEditModal}
        onSubmit={() => void brokerManagement.updateBroker()}
      />
    </section>
  );
}
