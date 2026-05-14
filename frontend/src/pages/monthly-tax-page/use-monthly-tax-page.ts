import { useCallback, useEffect, useState } from 'react';
import type {
  MonthlyTaxBlockedReason,
  MonthlyTaxCloseDetail,
  MonthlyTaxCloseSummary,
} from '@/types/api.types';
import { buildErrorMessage } from '../../errors/build-error-message';
import { getTaxReportApi } from '../../services/api/tax-report-api-provider';

type MonthlyTaxRepairTarget = NonNullable<MonthlyTaxBlockedReason['repairTarget']>;

export type MonthlyTaxRepairNavigation = {
  tab: MonthlyTaxRepairTarget['tab'];
  message: string;
};

type UseMonthlyTaxPageInput = {
  onRepairNavigate?: (navigation: MonthlyTaxRepairNavigation) => void;
};

type MonthlyTaxPageState = {
  months: MonthlyTaxCloseSummary[];
  selectedMonth: string | null;
  detail: MonthlyTaxCloseDetail | null;
  isHistoryLoading: boolean;
  isDetailLoading: boolean;
  errorMessage: string;
  detailErrorMessage: string;
  reloadWorkspace: () => Promise<void>;
  selectMonth: (month: string) => Promise<void>;
  followRepairTarget: (reason: MonthlyTaxBlockedReason) => void;
};

const repairTargetLabels: Record<MonthlyTaxRepairTarget['hintCode'], string> = {
  daily_broker_tax: 'Revise taxas diarias da corretora',
  irrf: 'Revise IRRF da operacao',
  asset_type: 'Revise a classificacao do ativo',
  broker_metadata: 'Revise os dados da corretora',
};

export function useMonthlyTaxPage({
  onRepairNavigate,
}: UseMonthlyTaxPageInput = {}): MonthlyTaxPageState {
  const [months, setMonths] = useState<MonthlyTaxCloseSummary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [detail, setDetail] = useState<MonthlyTaxCloseDetail | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [detailErrorMessage, setDetailErrorMessage] = useState('');

  const loadHistory = useCallback(async (): Promise<MonthlyTaxCloseSummary[]> => {
    setIsHistoryLoading(true);
    setErrorMessage('');

    try {
      const result = await getTaxReportApi().listMonthlyTaxHistory();
      setMonths(result.months);
      return result.months;
    } catch (error: unknown) {
      setMonths([]);
      setErrorMessage(buildErrorMessage(error));
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  }, []);

  const selectMonth = useCallback(async (month: string): Promise<void> => {
    setSelectedMonth(month);
    setIsDetailLoading(true);
    setDetailErrorMessage('');

    try {
      const result = await getTaxReportApi().getMonthlyTaxDetail({ month });
      setDetail(result.detail);

      if (result.detail === null) {
        setDetailErrorMessage('Detalhe mensal nao encontrado para o mes selecionado.');
      }
    } catch (error: unknown) {
      setDetail(null);
      setDetailErrorMessage(buildErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const reloadWorkspace = useCallback(async (): Promise<void> => {
    const loadedMonths = await loadHistory();

    if (selectedMonth === null) {
      return;
    }

    const selectedMonthStillExists = loadedMonths.some((month) => month.month === selectedMonth);

    if (!selectedMonthStillExists) {
      setSelectedMonth(null);
      setDetail(null);
      setDetailErrorMessage('');
      return;
    }

    await selectMonth(selectedMonth);
  }, [loadHistory, selectMonth, selectedMonth]);

  const followRepairTarget = useCallback(
    (reason: MonthlyTaxBlockedReason): void => {
      if (!reason.repairTarget) {
        return;
      }

      const metadataContext = formatMetadataContext(reason.metadata);
      const message = [
        `${repairTargetLabels[reason.repairTarget.hintCode]} para ${selectedMonth ?? 'o mes selecionado'}.`,
        reason.message,
        metadataContext,
      ]
        .filter((part) => part.length > 0)
        .join(' ');

      onRepairNavigate?.({
        tab: reason.repairTarget.tab,
        message,
      });
    },
    [onRepairNavigate, selectedMonth],
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return {
    months,
    selectedMonth,
    detail,
    isHistoryLoading,
    isDetailLoading,
    errorMessage,
    detailErrorMessage,
    reloadWorkspace,
    selectMonth,
    followRepairTarget,
  };
}

function formatMetadataContext(metadata: MonthlyTaxBlockedReason['metadata']): string {
  if (!metadata) {
    return '';
  }

  const parts = Object.entries(metadata).map(([key, value]) => {
    const renderedValue = Array.isArray(value) ? value.join(', ') : value;
    return `${key}: ${renderedValue}`;
  });

  if (parts.length === 0) {
    return '';
  }

  return `Contexto: ${parts.join('; ')}.`;
}
