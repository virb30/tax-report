
import { ELECTRON_API_CHANNELS, REGISTERED_IPC_CHANNELS } from '../ipc-channels';
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

  it('derives compatibility channel exports from contracts', () => {
    const electronApiChannels: Record<string, string> = {};

    for (const contract of rendererExposedIpcContracts) {
      if (contract.api !== undefined) {
        electronApiChannels[contract.api.name] = contract.channel;
      }
    }

    expect(REGISTERED_IPC_CHANNELS).toEqual(ipcContracts.map((contract) => contract.channel));
    expect(ELECTRON_API_CHANNELS).toEqual(electronApiChannels);
  });
});
