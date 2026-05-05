import { renderHook, act } from '@testing-library/react';
import { useCapitalGainsPage } from './use-capital-gains-page';
import type { GenerateCapitalGainsAssessmentResult } from '../../../preload/contracts/tax-reporting/capital-gains-assessment.contract';
import { CapitalGainsAssessmentStatus } from '../../../shared/types/domain';

describe('useCapitalGainsPage', () => {
  const mockAssessment: GenerateCapitalGainsAssessmentResult = {
    baseYear: 2025,
    generatedAt: '2026-01-01T00:00:00Z',
    annualTotals: {
      saleProceeds: 100000,
      taxableGain: 10000,
      exemptStockGain: 5000,
      loss: 2000,
      compensatedLoss: 1000,
      remainingLossBalance: 1000,
      categories: [],
    },
    months: [
      {
        month: '2025-01',
        status: CapitalGainsAssessmentStatus.Ready,
        categories: [],
        blockers: [],
        saleTraces: [],
      },
    ],
    summaryBlockers: [],
  };

  beforeEach(() => {
    window.electronApi = {
      generateCapitalGainsAssessment: jest.fn().mockResolvedValue(mockAssessment),
    } as any;
  });

  it('should initialize with default base year', () => {
    const { result } = renderHook(() => useCapitalGainsPage());
    expect(result.current.baseYear).toBeDefined();
    expect(result.current.assessment).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should generate assessment successfully', async () => {
    const { result } = renderHook(() => useCapitalGainsPage());

    await act(async () => {
      await result.current.generateAssessment();
    });

    expect(window.electronApi.generateCapitalGainsAssessment).toHaveBeenCalledWith({
      baseYear: Number(result.current.baseYear),
    });
    expect(result.current.assessment).toEqual(mockAssessment);
    expect(result.current.errorMessage).toBe('');
  });

  it('should handle errors during assessment generation', async () => {
    const errorMessage = 'API Error';
    (window.electronApi.generateCapitalGainsAssessment as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useCapitalGainsPage());

    await act(async () => {
      await result.current.generateAssessment();
    });

    expect(result.current.assessment).toBeNull();
    expect(result.current.errorMessage).toBe(errorMessage);
  });

  it('should toggle month expansion', () => {
    const { result } = renderHook(() => useCapitalGainsPage());

    act(() => {
      result.current.toggleMonthExpansion('2025-01');
    });
    expect(result.current.expandedMonths.has('2025-01')).toBe(true);

    act(() => {
      result.current.toggleMonthExpansion('2025-01');
    });
    expect(result.current.expandedMonths.has('2025-01')).toBe(false);
  });
});
