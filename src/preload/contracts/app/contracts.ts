import { z } from 'zod';
import { defineIpcContract } from '../../ipc/define-ipc-contract';

export type HealthCheckResult = {
  status: 'ok';
};

export const healthCheckSchema = z.void();

export const healthCheckContract = defineIpcContract<HealthCheckResult>()({
  id: 'app.healthCheck',
  channel: 'app:health-check',
  inputSchema: healthCheckSchema,
  errorMode: 'throw',
  exposeToRenderer: false,
  requireObjectInput: false,
});

export const appIpcContracts = [healthCheckContract] as const;
