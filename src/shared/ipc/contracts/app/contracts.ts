import { z } from 'zod';
import { defineIpcContract } from '../../define-ipc-contract';
import { APP_IPC_CHANNELS } from '../../ipc-channels';

export type HealthCheckResult = {
  status: 'ok';
};

export const healthCheckSchema = z.void();

export const healthCheckContract = defineIpcContract<HealthCheckResult>()({
  id: 'app.healthCheck',
  channel: APP_IPC_CHANNELS.healthCheck,
  inputSchema: healthCheckSchema,
  errorMode: 'throw',
  exposeToRenderer: false,
  requireObjectInput: false,
});

export const appIpcContracts = [healthCheckContract] as const;
