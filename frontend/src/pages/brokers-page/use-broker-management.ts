import { useEffect, useState } from 'react';
import { buildErrorMessage } from '../../errors/build-error-message';
import { listBrokers } from '../../services/api/list-brokers';
import { getTaxReportApi } from '../../services/api/tax-report-api-provider';
import type { Broker } from '../../types/broker.types';

type BrokerFormValues = {
  code: string;
  name: string;
  cnpj: string;
};

const EMPTY_FORM_VALUES: BrokerFormValues = {
  code: '',
  name: '',
  cnpj: '',
};

export function useBrokerManagement() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [createValues, setCreateValues] = useState<BrokerFormValues>(EMPTY_FORM_VALUES);
  const [editValues, setEditValues] = useState<BrokerFormValues>(EMPTY_FORM_VALUES);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function loadBrokers(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    try {
      setBrokers(await listBrokers());
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadBrokers();
  }, []);

  function updateCreateValue(field: keyof BrokerFormValues, value: string): void {
    setCreateValues((current) => ({ ...current, [field]: value }));
  }

  function updateEditValue(field: keyof BrokerFormValues, value: string): void {
    setEditValues((current) => ({ ...current, [field]: value }));
  }

  function openEditModal(broker: Broker): void {
    setEditingBroker(broker);
    setEditValues({
      name: broker.name,
      code: broker.code,
      cnpj: broker.cnpj,
    });
    setErrorMessage('');
  }

  function closeEditModal(): void {
    setEditingBroker(null);
    setEditValues(EMPTY_FORM_VALUES);
  }

  async function createBroker(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await getTaxReportApi().createBroker(createValues);
      if (result.success) {
        setFeedbackMessage('Corretora cadastrada com sucesso.');
        setCreateValues(EMPTY_FORM_VALUES);
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

  async function updateBroker(): Promise<void> {
    if (!editingBroker) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await getTaxReportApi().updateBroker({
        id: editingBroker.id,
        ...editValues,
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

  async function toggleBrokerActive(broker: Broker): Promise<void> {
    setTogglingId(broker.id);
    setErrorMessage('');
    setFeedbackMessage('');
    try {
      const result = await getTaxReportApi().toggleBrokerActive({ id: broker.id });
      if (result.success) {
        setFeedbackMessage(result.broker.active ? 'Corretora ativada.' : 'Corretora desativada.');
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

  return {
    brokers,
    createValues,
    editValues,
    editingBroker,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSaving,
    togglingId,
    updateCreateValue,
    updateEditValue,
    openEditModal,
    closeEditModal,
    createBroker,
    updateBroker,
    toggleBrokerActive,
  };
}
