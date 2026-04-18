import { z } from 'zod';
import { IpcController } from './ipc-controller.interface';
import { CreateBrokerUseCase } from '../../application/use-cases/create-broker/create-broker.use-case';
import { ListBrokersUseCase } from '../../application/use-cases/list-brokers/list-brokers.use-case';
import { UpdateBrokerUseCase } from '../../application/use-cases/update-broker/update-broker.use-case';
import { ToggleActiveBrokerUseCase } from '../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';

const listBrokersSchema = z.object({
  activeOnly: z.boolean().optional(),
}).optional().catch(undefined);

const createBrokerSchema = z.object({
  name: z.string({ message: 'Invalid name for create broker.' }),
  cnpj: z.string({ message: 'Invalid CNPJ for create broker.' }),
  code: z.string().optional(),
  codigo: z.string().optional(),
}).refine(data => data.code !== undefined || data.codigo !== undefined, {
  message: 'Invalid code for create broker.',
  path: ['code']
}).transform(data => ({
  name: data.name,
  cnpj: data.cnpj,
  code: (data.code ?? data.codigo) as string,
}));

const updateBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for update broker.'),
  name: z.string().optional(),
  cnpj: z.string().optional(),
  code: z.string().optional(),
});

const toggleActiveBrokerSchema = z.object({
  id: z.string().trim().min(1, 'Invalid id for toggle broker active.'),
});

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
      const payload = listBrokersSchema.parse(input);
      return this.listBrokersUseCase.execute(payload);
    });

    ipcMain.handle('brokers:create', async (_event, input: unknown) => {
      try {
        const payload = createBrokerSchema.parse(input);
        const broker = await this.createBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof z.ZodError) {
          return { success: false, error: error.issues[0].message };
        }
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao criar corretora.' };
      }
    });

    ipcMain.handle('brokers:update', async (_event, input: unknown) => {
      try {
        const payload = updateBrokerSchema.parse(input);
        const broker = await this.updateBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof z.ZodError) {
          return { success: false, error: error.issues[0].message };
        }
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao atualizar corretora.' };
      }
    });

    ipcMain.handle('brokers:toggle-active', async (_event, input: unknown) => {
      try {
        const payload = toggleActiveBrokerSchema.parse(input);
        const broker = await this.toggleActiveBrokerUseCase.execute(payload);
        return { success: true, broker };
      } catch (error: unknown) {
        console.error(error);
        if (error instanceof z.ZodError) {
          return { success: false, error: error.issues[0].message };
        }
        if (error instanceof Error) {
          return { success: false, error: error.message };
        }
        return { success: false, error: 'Erro ao ativar/desativar corretora.' };
      }
    });

    return channels;
  }
}