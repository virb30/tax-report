export type TickerDataRecord = {
  ticker: string;
  cnpj: string;
  name?: string;
};

export interface TickerDataRepository {
  findByTicker(ticker: string): Promise<TickerDataRecord | null>;
  findAll(): Promise<TickerDataRecord[]>;
  save(record: TickerDataRecord): Promise<void>;
}
