import { IpcRegistry } from './ipc-registry';
import type { IpcMainHandleRegistry, IpcRegistrar } from './ipc-registrar';

describe('IpcRegistry', () => {
  it('registers every IPC registrar with the provided ipcMain handle registry', () => {
    const ipcMain = {} as IpcMainHandleRegistry;
    const registeredChannels: string[] = [];

    const createRegistrar = (channel: string): IpcRegistrar => ({
      register: (registry) => {
        expect(registry).toBe(ipcMain);
        registeredChannels.push(channel);
        return [channel];
      },
    });

    const registry = new IpcRegistry([
      createRegistrar('app:health-check'),
      createRegistrar('brokers:list'),
    ]);

    registry.registerAll(ipcMain);

    expect(registeredChannels).toEqual(['app:health-check', 'brokers:list']);
  });
});
