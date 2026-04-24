import { describe, expect, it } from '@jest/globals';
import { ELECTRON_API_CHANNELS } from '../ipc-channels';
import { ipcContracts, rendererExposedIpcContracts } from './ipc-contract-registry';

function expectUnique(values: string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

describe('ipc contract registry', () => {
  it('keeps contract channels unique', () => {
    expectUnique(ipcContracts.map((contract) => contract.channel));
  });

  it('keeps renderer API names unique for exposed contracts', () => {
    const apiNames = rendererExposedIpcContracts.map((contract) => contract.api?.name);

    expect(apiNames).not.toContain(undefined);
    expectUnique(apiNames.filter((name): name is string => name !== undefined));
  });

  it('registers every current preload channel as a renderer-exposed contract', () => {
    expect(new Set(rendererExposedIpcContracts.map((contract) => contract.channel))).toEqual(
      new Set(Object.values(ELECTRON_API_CHANNELS)),
    );
  });
});
