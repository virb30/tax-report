export type ParsedDailyBrokerTax = {
  date: string;
  brokerId: string;
  fees: number;
  irrf: number;
};

export type ParsedDailyBrokerTaxFile = {
  taxes: ParsedDailyBrokerTax[];
};

export interface DailyBrokerTaxesParser {
  parse(filePath: string): Promise<ParsedDailyBrokerTaxFile>;
}
