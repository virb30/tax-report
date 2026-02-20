export type ConsolidatedPositionRow = {
  ticker: string;
  quantity: number;
  averagePrice: number;
  brokerCode: string;
};

export interface ConsolidatedPositionParserPort {
  parse(filePath: string): Promise<ConsolidatedPositionRow[]>;
}
