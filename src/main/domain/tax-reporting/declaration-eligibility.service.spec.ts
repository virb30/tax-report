import { AssetType, ReportItemStatus } from '../../../shared/types/domain';
import { DeclarationEligibilityService } from './declaration-eligibility.service';

describe('DeclarationEligibilityService', () => {
  const service = new DeclarationEligibilityService();

  it('marks unsupported scope before any threshold evaluation', () => {
    expect(
      service.evaluate({
        assetType: AssetType.Stock,
        previousYearValue: 0,
        currentYearValue: 10000,
        hasPendingIssues: false,
        isSupported: false,
      }),
    ).toEqual({
      status: ReportItemStatus.Unsupported,
      reason: 'unsupported_scope',
    });
  });

  it('marks pending issues before eligibility thresholds', () => {
    expect(
      service.evaluate({
        assetType: AssetType.Stock,
        previousYearValue: 0,
        currentYearValue: 10000,
        hasPendingIssues: true,
        isSupported: true,
      }),
    ).toEqual({
      status: ReportItemStatus.Pending,
      reason: 'pending_issues',
    });
  });

  it('marks holdings as optional when below threshold but already held previously', () => {
    expect(
      service.evaluate({
        assetType: AssetType.Etf,
        previousYearValue: 100,
        currentYearValue: 140,
        hasPendingIssues: false,
        isSupported: true,
      }),
    ).toEqual({
      status: ReportItemStatus.Optional,
      reason: 'held_in_previous_year',
    });
  });
});
