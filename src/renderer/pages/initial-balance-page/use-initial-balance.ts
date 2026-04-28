import { useEffect, useState } from 'react';
import { AssetType } from '../../../shared/types/domain';
import type { PositionListItem } from '../../../shared/contracts/list-positions.contract';
import { buildYearOptions, getDefaultBaseYear } from '../../../shared/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';
import { unwrapIpcResult } from '../../ipc/unwrap-ipc-result';
import { listActiveBrokers } from '../../services/api/list-brokers';
import type { Broker } from '../../types/broker.types';

const defaultBaseYear = getDefaultBaseYear();

type SaveValidationResult = {
  averagePrice: number;
  quantity: number;
};

export function useInitialBalance() {
  const [year, setYear] = useState(defaultBaseYear);
  const [ticker, setTicker] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Stock);
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [positions, setPositions] = useState<PositionListItem[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    void loadBrokers();
  }, []);

  useEffect(() => {
    void loadPositions();
  }, [year]);

  async function loadBrokers(): Promise<void> {
    try {
      const activeBrokers = await listActiveBrokers();
      setBrokers(activeBrokers);
      setBrokerId((currentBrokerId) => currentBrokerId || activeBrokers[0]?.id || '');
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  async function loadPositions(): Promise<void> {
    setIsLoading(true);
    try {
      const result = await window.electronApi.listPositions({ baseYear: year });
      setPositions(unwrapIpcResult(result).items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  function validateSaveInput(): SaveValidationResult | null {
    const parsedQuantity = Number(quantity);
    const parsedAveragePrice = Number(averagePrice);

    if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setErrorMessage('Quantidade deve ser maior que zero.');
      return null;
    }

    if (Number.isNaN(parsedAveragePrice) || parsedAveragePrice <= 0) {
      setErrorMessage('Preço médio deve ser maior que zero.');
      return null;
    }

    if (!brokerId) {
      setErrorMessage('Selecione uma corretora.');
      return null;
    }

    return {
      averagePrice: parsedAveragePrice,
      quantity: parsedQuantity,
    };
  }

  async function saveInitialBalance(): Promise<void> {
    setIsSaving(true);
    setErrorMessage('');
    setFeedbackMessage('');

    const validatedInput = validateSaveInput();
    if (validatedInput == null) {
      setIsSaving(false);
      return;
    }

    try {
      unwrapIpcResult(
        await window.electronApi.setInitialBalance({
          ticker: ticker.toUpperCase().trim(),
          brokerId,
          assetType,
          quantity: validatedInput.quantity,
          averagePrice: validatedInput.averagePrice,
          year,
        }),
      );
      setFeedbackMessage('Saldo inicial cadastrado com sucesso.');
      setTicker('');
      setQuantity('');
      setAveragePrice('');
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return {
    assetType,
    averagePrice,
    brokerId,
    brokers,
    canSave:
      !isSaving &&
      ticker.trim().length > 0 &&
      brokerId.length > 0 &&
      quantity.trim().length > 0 &&
      averagePrice.trim().length > 0,
    defaultBaseYear,
    errorMessage,
    feedbackMessage,
    isLoading,
    isSaving,
    positions,
    quantity,
    saveInitialBalance,
    setAssetType,
    setAveragePrice,
    setBrokerId,
    setQuantity,
    setTicker,
    setYear,
    ticker,
    year,
    yearOptions: buildYearOptions(defaultBaseYear),
  };
}
