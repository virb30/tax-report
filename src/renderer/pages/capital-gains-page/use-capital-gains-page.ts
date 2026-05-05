import { useState, useCallback } from 'react';
import type { GenerateCapitalGainsAssessmentResult } from '../../../preload/contracts/tax-reporting/capital-gains-assessment.contract';
import { buildYearOptions, getDefaultBaseYear } from '../../../shared/utils/year';
import { buildErrorMessage } from '../../errors/build-error-message';

export function useCapitalGainsPage() {
  const defaultBaseYear = getDefaultBaseYear();
  const yearOptions = buildYearOptions(defaultBaseYear, {
    yearsBefore: 9,
    yearsAfter: 0,
    descending: true,
  });

  const [baseYear, setBaseYear] = useState(String(defaultBaseYear));
  const [assessment, setAssessment] = useState<GenerateCapitalGainsAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const generateAssessment = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const result = await window.electronApi.generateCapitalGainsAssessment({
        baseYear: Number(baseYear),
      });
      setAssessment(result);
    } catch (error: unknown) {
      setAssessment(null);
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [baseYear]);

  const toggleMonthExpansion = (month: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  return {
    baseYear,
    setBaseYear,
    yearOptions,
    assessment,
    isLoading,
    errorMessage,
    generateAssessment,
    expandedMonths,
    toggleMonthExpansion,
  };
}
