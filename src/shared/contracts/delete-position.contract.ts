export type DeletePositionCommand = {
  ticker: string;
  year: number;
};

export type DeletePositionResult = {
  deleted: boolean;
};
