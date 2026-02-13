export type AppHealthResult = {
  status: 'ok';
};

export class GetAppHealthUseCase {
  execute(): AppHealthResult {
    return { status: 'ok' };
  }
}
