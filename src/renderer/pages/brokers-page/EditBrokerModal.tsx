import type { JSX } from 'react';
import type { Broker } from '../../types/broker.types';
import { BrokerForm } from './BrokerForm';

type BrokerFormValues = {
  code: string;
  name: string;
  cnpj: string;
};

type EditBrokerModalProps = {
  broker: Broker | null;
  isSaving: boolean;
  values: BrokerFormValues;
  onChange: (field: keyof BrokerFormValues, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function EditBrokerModal({
  broker,
  isSaving,
  values,
  onChange,
  onClose,
  onSubmit,
}: EditBrokerModalProps): JSX.Element | null {
  if (!broker) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-broker-title"
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <BrokerForm
          title="Editar corretora"
          submitLabel="Salvar"
          isSubmitting={isSaving}
          values={values}
          onChange={onChange}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
