import { useEffect, useState } from 'react';
import { unwrapApiResult } from '@/services/api/api-result';
import { getTaxReportApi } from '@/services/api/tax-report-api-provider';
import type {
  PositionListItem,
  RecalculatePositionCommand,
  AveragePriceFeeMode,
} from '@/types/api.types';
import { buildYearOptions, getDefaultBaseYear } from '@/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';

const defaultBaseYear = getDefaultBaseYear();

export function usePositionsPage() {
  const [baseYear, setBaseYear] = useState(defaultBaseYear);
  const [positions, setPositions] = useState<PositionListItem[]>([]);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [recalculatingTicker, setRecalculatingTicker] = useState<string | null>(null);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [migrateModalOpen, setMigrateModalOpen] = useState(false);
  const [importConsolidatedModalOpen, setImportConsolidatedModalOpen] = useState(false);
  const [deletingTicker, setDeletingTicker] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [averagePriceFeeMode, setAveragePriceFeeMode] = useState<AveragePriceFeeMode>('include');

  useEffect(() => {
    void loadPositions();
  }, [baseYear]);

  async function loadPositions(): Promise<void> {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await getTaxReportApi().listPositions({ baseYear });
      setPositions(unwrapApiResult(result).items);
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function recalculatePosition(ticker: string): Promise<void> {
    setRecalculatingTicker(ticker);
    setErrorMessage('');
    try {
      unwrapApiResult(await getTaxReportApi().recalculatePosition(buildRecalculateCommand(ticker)));
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setRecalculatingTicker(null);
    }
  }

  async function recalculateAllPositions(): Promise<void> {
    setRecalculatingAll(true);
    setErrorMessage('');
    try {
      for (const position of positions) {
        unwrapApiResult(
          await getTaxReportApi().recalculatePosition(buildRecalculateCommand(position.ticker)),
        );
      }
      await loadPositions();
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setRecalculatingAll(false);
    }
  }

  async function deletePosition(ticker: string): Promise<void> {
    if (!window.confirm(`Excluir o ativo ${ticker} da posição de ${baseYear}?`)) {
      return;
    }

    setDeletingTicker(ticker);
    setErrorMessage('');
    try {
      const result = await getTaxReportApi().deletePosition({ ticker, year: baseYear });
      if (unwrapApiResult(result).deleted) {
        await loadPositions();
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setDeletingTicker(null);
    }
  }

  async function deleteAllPositions(): Promise<void> {
    if (
      !window.confirm(`Excluir todos os ativos e transações vinculadas da posição de ${baseYear}?`)
    ) {
      return;
    }

    setDeletingAll(true);
    setErrorMessage('');
    try {
      const result = await getTaxReportApi().deleteAllPositions({ year: baseYear });
      if (unwrapApiResult(result).deletedCount > 0) {
        await loadPositions();
      }
    } catch (error: unknown) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setDeletingAll(false);
    }
  }

  function toggleExpand(ticker: string): void {
    setExpandedTickers((currentExpandedTickers) => {
      const nextExpandedTickers = new Set(currentExpandedTickers);
      if (nextExpandedTickers.has(ticker)) {
        nextExpandedTickers.delete(ticker);
      } else {
        nextExpandedTickers.add(ticker);
      }
      return nextExpandedTickers;
    });
  }

  function handleMigrateSuccess(targetYear?: number): void {
    setMigrateModalOpen(false);
    if (targetYear != null) {
      setBaseYear(targetYear);
      return;
    }

    void loadPositions();
  }

  function buildRecalculateCommand(ticker: string): RecalculatePositionCommand {
    const baseCommand = { ticker, year: baseYear };
    if (averagePriceFeeMode === 'include') {
      return baseCommand;
    }

    return {
      ...baseCommand,
      averagePriceFeeMode,
    };
  }

  return {
    averagePriceFeeMode,
    baseYear,
    deletingAll,
    deletingTicker,
    deleteAllPositions,
    deletePosition,
    errorMessage,
    expandedTickers,
    importConsolidatedModalOpen,
    isLoading,
    migrateModalOpen,
    openImportConsolidatedModal: () => setImportConsolidatedModalOpen(true),
    openMigrateModal: () => setMigrateModalOpen(true),
    positions,
    recalculateAllPositions,
    recalculatePosition,
    recalculatingAll,
    recalculatingTicker,
    refreshPositions: () => void loadPositions(),
    setBaseYear,
    setAveragePriceFeeMode,
    setImportConsolidatedModalOpen,
    setMigrateModalOpen,
    toggleExpand,
    yearOptions: buildYearOptions(defaultBaseYear),
    handleMigrateSuccess,
  };
}
