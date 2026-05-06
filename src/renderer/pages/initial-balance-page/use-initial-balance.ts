import { useEffect, useState } from 'react';
import { AssetType, unwrapIpcResult } from '../../../ipc/public';
import type { InitialBalanceDocument, PositionListItem } from '../../../ipc/public';
import { buildYearOptions, getDefaultBaseYear } from '../../../shared/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';
import { listActiveBrokers } from '../../services/api/list-brokers';
import type { Broker } from '../../types/broker.types';

const defaultBaseYear = getDefaultBaseYear();

export type InitialBalanceAllocationDraft = {
  id: string;
  brokerId: string;
  quantity: string;
};

type SaveValidationResult = {
  allocations: Array<{ brokerId: string; quantity: string }>;
  averagePrice: number;
  issuerCnpj?: string;
  issuerName?: string;
  ticker: string;
};

type ResetEditorOptions = {
  clearMessages?: boolean;
};

function createAllocationDraft(
  nextId: number,
  defaultBrokerId = '',
): InitialBalanceAllocationDraft {
  return {
    id: `allocation-${nextId}`,
    brokerId: defaultBrokerId,
    quantity: '',
  };
}

function toDocumentKey(ticker: string, year: number): string {
  return `${ticker}:${year}`;
}

export function useInitialBalance() {
  const [year, setYearState] = useState(defaultBaseYear);
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState<AssetType>(AssetType.Stock);
  const [issuerName, setIssuerName] = useState('');
  const [issuerCnpj, setIssuerCnpj] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [allocations, setAllocations] = useState<InitialBalanceAllocationDraft[]>([
    createAllocationDraft(1),
  ]);
  const [nextAllocationId, setNextAllocationId] = useState(2);
  const [documents, setDocuments] = useState<InitialBalanceDocument[]>([]);
  const [positions, setPositions] = useState<PositionListItem[]>([]);
  const [editingDocumentKey, setEditingDocumentKey] = useState<string | null>(null);
  const [deletingDocumentKey, setDeletingDocumentKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(false);

  useEffect(() => {
    void loadBrokers();
  }, []);

  useEffect(() => {
    void loadYearData(year);
  }, [year]);

  function resetEditor(nextYear = year, options: ResetEditorOptions = {}): void {
    const { clearMessages = true } = options;

    setTicker('');
    setAssetType(AssetType.Stock);
    setIssuerName('');
    setIssuerCnpj('');
    setAveragePrice('');
    setAllocations([createAllocationDraft(1, brokers[0]?.id ?? '')]);
    setNextAllocationId(2);
    setEditingDocumentKey(null);
    if (clearMessages) {
      setFeedbackMessage('');
      setErrorMessage('');
    }
    setYearState(nextYear);
  }

  async function loadBrokers(): Promise<void> {
    try {
      const activeBrokers = await listActiveBrokers();
      setBrokers(activeBrokers);
      setAllocations((currentAllocations) =>
        currentAllocations.map((allocation, index) =>
          index === 0 && allocation.brokerId.length === 0
            ? { ...allocation, brokerId: activeBrokers[0]?.id ?? '' }
            : allocation,
        ),
      );
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    }
  }

  async function loadYearData(targetYear: number): Promise<void> {
    await Promise.all([loadDocuments(targetYear), loadPositions(targetYear)]);
  }

  async function loadDocuments(targetYear = year): Promise<void> {
    setIsLoadingDocuments(true);
    try {
      const result = await window.electronApi.listInitialBalanceDocuments({ year: targetYear });
      setDocuments(unwrapIpcResult(result).items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  async function loadPositions(targetYear = year): Promise<void> {
    setIsLoadingPositions(true);
    try {
      const result = await window.electronApi.listPositions({ baseYear: targetYear });
      setPositions(unwrapIpcResult(result).items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoadingPositions(false);
    }
  }

  function validateSaveInput(): SaveValidationResult | null {
    const parsedAveragePrice = Number(averagePrice);
    const normalizedTicker = ticker.toUpperCase().trim();
    const normalizedIssuerName = issuerName.trim();
    const normalizedIssuerCnpj = issuerCnpj.trim();

    if (normalizedTicker.length === 0) {
      setErrorMessage('Informe um ticker.');
      return null;
    }

    if (Number.isNaN(parsedAveragePrice) || parsedAveragePrice <= 0) {
      setErrorMessage('Preço médio deve ser maior que zero.');
      return null;
    }

    if (allocations.length === 0) {
      setErrorMessage('Adicione pelo menos uma alocação.');
      return null;
    }

    const parsedAllocations: Array<{ brokerId: string; quantity: string }> = [];

    for (const allocation of allocations) {
      if (allocation.brokerId.length === 0) {
        setErrorMessage('Selecione uma corretora para cada alocação.');
        return null;
      }

      const parsedQuantity = Number(allocation.quantity);
      if (Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
        setErrorMessage('Quantidade deve ser maior que zero em todas as alocações.');
        return null;
      }

      parsedAllocations.push({
        brokerId: allocation.brokerId,
        quantity: String(parsedQuantity),
      });
    }

    return {
      allocations: parsedAllocations,
      averagePrice: parsedAveragePrice,
      issuerCnpj: normalizedIssuerCnpj.length > 0 ? normalizedIssuerCnpj : undefined,
      issuerName: normalizedIssuerName.length > 0 ? normalizedIssuerName : undefined,
      ticker: normalizedTicker,
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

    const wasEditing = editingDocumentKey !== null;

    try {
      unwrapIpcResult(
        await window.electronApi.saveInitialBalanceDocument({
          ticker: validatedInput.ticker,
          year,
          assetType,
          name: validatedInput.issuerName,
          cnpj: validatedInput.issuerCnpj,
          averagePrice: String(validatedInput.averagePrice),
          allocations: validatedInput.allocations,
        }),
      );

      setFeedbackMessage(
        wasEditing
          ? 'Saldo inicial atualizado com sucesso.'
          : 'Saldo inicial cadastrado com sucesso.',
      );
      resetEditor(year, { clearMessages: false });
      await loadYearData(year);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDocument(document: InitialBalanceDocument): Promise<void> {
    if (!window.confirm(`Excluir o saldo inicial de ${document.ticker} em ${document.year}?`)) {
      return;
    }

    const documentKey = toDocumentKey(document.ticker, document.year);
    setDeletingDocumentKey(documentKey);
    setErrorMessage('');
    setFeedbackMessage('');

    try {
      const result = await window.electronApi.deleteInitialBalanceDocument({
        ticker: document.ticker,
        year: document.year,
      });
      unwrapIpcResult(result);

      if (editingDocumentKey === documentKey) {
        resetEditor(year, { clearMessages: false });
      }

      setFeedbackMessage('Saldo inicial excluído com sucesso.');
      await loadYearData(year);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setDeletingDocumentKey(null);
    }
  }

  function editDocument(document: InitialBalanceDocument): void {
    setTicker(document.ticker);
    setAssetType(document.assetType);
    setIssuerName(document.name ?? '');
    setIssuerCnpj(document.cnpj ?? '');
    setAveragePrice(document.averagePrice.toString());
    setAllocations(
      document.allocations.map((allocation, index) => ({
        id: `allocation-${index + 1}`,
        brokerId: allocation.brokerId,
        quantity: allocation.quantity.toString(),
      })),
    );
    setNextAllocationId(document.allocations.length + 1);
    setEditingDocumentKey(toDocumentKey(document.ticker, document.year));
    setFeedbackMessage('');
    setErrorMessage('');
  }

  function addAllocation(): void {
    setAllocations((currentAllocations) => [
      ...currentAllocations,
      createAllocationDraft(nextAllocationId, ''),
    ]);
    setNextAllocationId((currentId) => currentId + 1);
  }

  function updateAllocationBrokerId(allocationId: string, brokerId: string): void {
    setAllocations((currentAllocations) =>
      currentAllocations.map((allocation) =>
        allocation.id === allocationId ? { ...allocation, brokerId } : allocation,
      ),
    );
  }

  function updateAllocationQuantity(allocationId: string, quantity: string): void {
    setAllocations((currentAllocations) =>
      currentAllocations.map((allocation) =>
        allocation.id === allocationId ? { ...allocation, quantity } : allocation,
      ),
    );
  }

  function removeAllocation(allocationId: string): void {
    setAllocations((currentAllocations) => {
      if (currentAllocations.length === 1) {
        return currentAllocations;
      }

      return currentAllocations.filter((allocation) => allocation.id !== allocationId);
    });
  }

  function setYear(nextYear: number): void {
    resetEditor(nextYear);
  }

  return {
    addAllocation,
    allocations,
    assetType,
    averagePrice,
    brokers,
    canRemoveAllocation: allocations.length > 1,
    canSave:
      !isSaving &&
      ticker.trim().length > 0 &&
      averagePrice.trim().length > 0 &&
      allocations.every(
        (allocation) => allocation.brokerId.length > 0 && allocation.quantity.trim().length > 0,
      ),
    defaultBaseYear,
    deleteDocument,
    deletingDocumentKey,
    documents,
    editDocument,
    editingDocumentKey,
    errorMessage,
    feedbackMessage,
    issuerCnpj,
    issuerName,
    isEditing: editingDocumentKey !== null,
    isLoadingDocuments,
    isLoadingPositions,
    isSaving,
    positions,
    removeAllocation,
    resetEditor,
    saveInitialBalance,
    setAssetType,
    setAveragePrice,
    setIssuerCnpj,
    setIssuerName,
    setTicker,
    setYear,
    ticker,
    updateAllocationBrokerId,
    updateAllocationQuantity,
    year,
    yearOptions: buildYearOptions(defaultBaseYear),
  };
}
