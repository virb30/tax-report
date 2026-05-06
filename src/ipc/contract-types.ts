import type { z } from 'zod';

export type IpcErrorMode = 'throw' | 'result';

export type IpcContractApiMetadata = {
  name: string;
};

export type IpcContractDefinition<
  TInputSchema extends z.ZodType,
  TOutput,
  TId extends string = string,
  TChannel extends string = string,
> = {
  id: TId;
  channel: TChannel;
  inputSchema: TInputSchema;
  errorMode: IpcErrorMode;
  exposeToRenderer: boolean;
  api?: IpcContractApiMetadata;
  payloadErrorMessage?: string;
  requireObjectInput?: boolean;
  readonly __outputType?: TOutput;
};

export type IpcContractInput<TContract extends IpcContractDefinition<z.ZodType, unknown>> =
  z.output<TContract['inputSchema']>;

export type IpcContractOutput<TContract extends IpcContractDefinition<z.ZodType, unknown>> =
  TContract extends IpcContractDefinition<z.ZodType, infer TOutput> ? TOutput : never;
