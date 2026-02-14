export function buildErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Falha inesperada. Revise os dados informados e tente novamente.';
}
