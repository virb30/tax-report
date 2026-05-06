import {
  generateAssetsReportContract,
  generateAssetsReportSchema,
  reportIpcContracts,
} from './contracts';

describe('tax reporting contracts', () => {
  it('preserves assets report public contract metadata', () => {
    expect(reportIpcContracts).toEqual([generateAssetsReportContract]);
    expect(generateAssetsReportContract).toMatchObject({
      id: 'report.generateAssets',
      channel: 'report:assets-annual',
      errorMode: 'throw',
      exposeToRenderer: true,
      api: { name: 'generateAssetsReport' },
    });
  });

  it('validates annual report payloads', () => {
    expect(generateAssetsReportSchema.parse({ baseYear: 2025 })).toEqual({ baseYear: 2025 });
    expect(() => generateAssetsReportSchema.parse({ baseYear: 2025.5 })).toThrow();
  });
});
