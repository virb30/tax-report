import { IpcController } from './ipc-controller.interface';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import { CreateBrokerInput } from '../../application/use-cases/create-broker/create-broker.input';
import { UpdateBrokerInput } from '../../application/use-cases/update-broker/update-broker.input';
import { ToggleActiveBrokerInput } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.input';
import { ListBrokersInput } from '../../application/use-cases/list-brokers/list-brokers.input';

export class BrokersController implements IpcController {
  constructor(
    private readonly listBrokersUseCase: ListBrokersUseCase,
    private readonly createBrokerUseCase: CreateBrokerUseCase,
    private readonly updateBrokerUseCase: UpdateBrokerUseCase,
    private readonly toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase,
  ) {}

  register(ipcMain: Electron.IpcMain): string[] {
    const channels = [
      'brokers:list',
      'brokers:create',
      'brokers:update',
      'brokers:toggle-active',
    ];

    ipcMain.handle('brokers:list', async (_event, input?: unknown) => {
      const payload = this.parseListBrokersInput(input);
      return this.listBrokersUseCase.execute(payload);
    });

    ipcMain.handle('brokers:create', async (_event, input: unknown) => {
      try {
        const payload = this.parseCreateBrokerInput(input);
        const broker = await this.createBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao criar corretora.' };
      }
    });

    ipcMain.handle('brokers:update', async (_event, input: unknown) => {
      try {
        const payload = this.parseUpdateBrokerInput(input);
        const broker = await this.updateBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao atualizar corretora.' };
      }
    });

    ipcMain.handle('brokers:toggle-active', async (_event, input: unknown) => {
      try {
        const payload = this.parseToggleBrokerActiveInput(input);
        const broker = await this.toggleActiveBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao ativar/desativar corretora.' };
      }
    });

    return channels;
  }

  private parseListBrokersInput(input: unknown): ListBrokersInput | undefined {
    if (input === undefined || input === null) {
      return undefined;
    }
    if (typeof input !== 'object') {
      return undefined;
    }
    const payload = input as { activeOnly?: unknown };
    if (typeof payload.activeOnly === 'boolean') {
      return { activeOnly: payload.activeOnly };
    }
    return undefined;
  }

  private parseCreateBrokerInput(input: unknown): CreateBrokerInput {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid payload for create broker.');
    }
    const payload = input as { name?: unknown; cnpj?: unknown; codigo?: unknown; code?: unknown };
    if (typeof payload.name !== 'string') {
      throw new Error('Invalid name for create broker.');
    }
    if (typeof payload.cnpj !== 'string') {
      throw new Error('Invalid CNPJ for create broker.');
    }
    const codeValue = payload.code ?? payload.codigo;
    if (typeof codeValue !== 'string') {
      throw new Error('Invalid code for create broker.');
    }
    return {
      name: payload.name,
      cnpj: payload.cnpj,
      code: codeValue,
    };
  }

  private parseUpdateBrokerInput(input: unknown): UpdateBrokerInput {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid payload for update broker.');
    }
    const payload = input as { id?: unknown; name?: unknown; cnpj?: unknown; code?: unknown };
    if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
      throw new Error('Invalid id for update broker.');
    }
    return {
      id: payload.id,
      ...(typeof payload.name === 'string' && { name: payload.name }),
      ...(typeof payload.cnpj === 'string' && { cnpj: payload.cnpj }),
      ...(typeof payload.code === 'string' && { code: payload.code }),
    };
  }

  private parseToggleBrokerActiveInput(input: unknown): ToggleActiveBrokerInput {
    if (!input || typeof input !== 'object') {
      throw new Error('Invalid payload for toggle broker active.');
    }
    const payload = input as { id?: unknown };
    if (typeof payload.id !== 'string' || payload.id.trim().length === 0) {
      throw new Error('Invalid id for toggle broker active.');
    }
    return { id: payload.id };
  }
}