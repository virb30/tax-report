import { appIpcContracts, healthCheckContract, healthCheckSchema } from './contracts';

describe('app contracts', () => {
  it('preserves health check public contract metadata', () => {
    expect(appIpcContracts).toEqual([healthCheckContract]);
    expect(healthCheckContract).toMatchObject({
      id: 'app.healthCheck',
      channel: 'app:health-check',
      errorMode: 'throw',
      exposeToRenderer: false,
      requireObjectInput: false,
    });
  });

  it('keeps health check payload validation void', () => {
    expect(healthCheckSchema.parse(undefined)).toBeUndefined();
    expect(() => healthCheckSchema.parse({})).toThrow();
  });
});
