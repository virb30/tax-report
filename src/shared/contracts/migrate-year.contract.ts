export type MigrateYearCommand = {
  sourceYear: number;
  targetYear: number;
};

export type MigrateYearResult = {
  migratedPositionsCount: number;
  createdTransactionsCount: number;
  message?: string;
};
