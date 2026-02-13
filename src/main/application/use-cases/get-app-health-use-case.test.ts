import { describe, expect, it } from '@jest/globals';
import { GetAppHealthUseCase } from './get-app-health-use-case';

describe('GetAppHealthUseCase', () => {
  it('returns application health status', () => {
    const useCase = new GetAppHealthUseCase();

    expect(useCase.execute()).toEqual({ status: 'ok' });
  });
});
