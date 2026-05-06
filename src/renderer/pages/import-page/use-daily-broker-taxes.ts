import { useCallback, useEffect, useState } from 'react';
import type { DailyBrokerTaxItem } from '../../../ipc/public';
import { buildErrorMessage } from '../../errors/build-error-message';
import type { Broker } from '../../types/broker.types';

type DailyBrokerTaxForm = {
  date: string;
  brokerId: string;
  fees: string;
  irrf: string;
};

const emptyForm: DailyBrokerTaxForm = {
  date: '',
  brokerId: '',
  fees: '',
  irrf: '',
};

export function useDailyBrokerTaxes(brokers: Broker[]) {
  const [taxes, setTaxes] = useState<DailyBrokerTaxItem[]>([]);
  const [form, setForm] = useState<DailyBrokerTaxForm>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingKey, setDeletingKey] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const loadTaxes = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await window.electronApi.listDailyBrokerTaxes();
      setTaxes(result.items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTaxes();
  }, [loadTaxes]);

  useEffect(() => {
    if (form.brokerId || brokers.length === 0) {
      return;
    }

    setForm((current) => ({
      ...current,
      brokerId: brokers[0]?.id ?? '',
    }));
  }, [brokers, form.brokerId]);

  function updateForm(field: keyof DailyBrokerTaxForm, value: string): void {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function saveTax(): Promise<void> {
    setIsSaving(true);
    setFeedbackMessage('');
    setErrorMessage('');
    try {
      const result = await window.electronApi.saveDailyBrokerTax({
        date: form.date,
        brokerId: form.brokerId,
        fees: parseMoneyInput(form.fees),
        irrf: parseMoneyInput(form.irrf),
      });
      setFeedbackMessage(
        buildRecalculationMessage('Taxa diária salva.', result.recalculatedTickers),
      );
      setForm((current) => ({ ...emptyForm, brokerId: current.brokerId }));
      await loadTaxes();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function importTaxes(): Promise<void> {
    setIsImporting(true);
    setFeedbackMessage('');
    setErrorMessage('');
    try {
      const selectedFile = await window.electronApi.importSelectFile();
      if (!selectedFile.filePath) {
        return;
      }

      const result = await window.electronApi.importDailyBrokerTaxes({
        filePath: selectedFile.filePath,
      });
      setFeedbackMessage(
        buildRecalculationMessage(
          `${result.importedCount} taxas diárias importadas.`,
          result.recalculatedTickers,
        ),
      );
      await loadTaxes();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function deleteTax(tax: DailyBrokerTaxItem): Promise<void> {
    const key = `${tax.date}::${tax.brokerId}`;
    setDeletingKey(key);
    setFeedbackMessage('');
    setErrorMessage('');
    try {
      const result = await window.electronApi.deleteDailyBrokerTax({
        date: tax.date,
        brokerId: tax.brokerId,
      });
      setFeedbackMessage(
        buildRecalculationMessage(
          result.deleted ? 'Taxa diária excluída.' : 'Taxa diária não encontrada.',
          result.recalculatedTickers,
        ),
      );
      await loadTaxes();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setDeletingKey('');
    }
  }

  return {
    taxes,
    form,
    isLoading,
    isSaving,
    isImporting,
    deletingKey,
    feedbackMessage,
    errorMessage,
    updateForm,
    saveTax,
    importTaxes,
    deleteTax,
  };
}

function parseMoneyInput(value: string): number {
  const normalizedValue = value.trim().replace(',', '.');
  if (!normalizedValue) {
    return 0;
  }

  return Number(normalizedValue);
}

function buildRecalculationMessage(message: string, tickers: string[]): string {
  return `${message} Posições recalculadas: ${tickers.join(', ') || 'nenhuma'}.`;
}
