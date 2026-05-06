import type { z } from 'zod';
import type { IpcContractDefinition } from './contract-types';

export function defineIpcContract<TOutput>() {
  return <const TId extends string, const TChannel extends string, TInputSchema extends z.ZodType>(
    contract: IpcContractDefinition<TInputSchema, TOutput, TId, TChannel>,
  ): IpcContractDefinition<TInputSchema, TOutput, TId, TChannel> => contract;
}
