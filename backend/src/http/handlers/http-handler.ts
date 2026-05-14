export interface HttpHandler<TInput, TOutput> {
  parse(input: unknown): TInput;
  execute(input: TInput): Promise<TOutput>;
}
