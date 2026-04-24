import type { CreateBrokerUseCase } from '../../../application/use-cases/create-broker/create-broker.use-case';
import type { ListBrokersUseCase } from '../../../application/use-cases/list-brokers/list-brokers.use-case';
import type { ToggleActiveBrokerUseCase } from '../../../application/use-cases/toggle-active-broker/toggle-active-broker.use-case';
import type { UpdateBrokerUseCase } from '../../../application/use-cases/update-broker/update-broker.use-case';
import type { IpcContractHandler } from '../../binding/bind-ipc-contract';
import type {
  createBrokerContract,
  listBrokersContract,
  toggleBrokerActiveContract,
  updateBrokerContract,
} from '../../../../shared/ipc/contracts/brokers';

export type BrokerIpcHandlers = {
  list: IpcContractHandler<typeof listBrokersContract>;
  create: IpcContractHandler<typeof createBrokerContract>;
  update: IpcContractHandler<typeof updateBrokerContract>;
  toggleActive: IpcContractHandler<typeof toggleBrokerActiveContract>;
};

export function createBrokerIpcHandlers(
  listBrokersUseCase: ListBrokersUseCase,
  createBrokerUseCase: CreateBrokerUseCase,
  updateBrokerUseCase: UpdateBrokerUseCase,
  toggleActiveBrokerUseCase: ToggleActiveBrokerUseCase,
): BrokerIpcHandlers {
  return {
    list: (payload) => listBrokersUseCase.execute(payload),
    create: async (payload) => {
      const broker = await createBrokerUseCase.execute(payload);
      return { success: true as const, broker };
    },
    update: async (payload) => {
      const broker = await updateBrokerUseCase.execute(payload);
      return { success: true as const, broker };
    },
    toggleActive: async (payload) => {
      const broker = await toggleActiveBrokerUseCase.execute(payload);
      return { success: true as const, broker };
    },
  };
}
