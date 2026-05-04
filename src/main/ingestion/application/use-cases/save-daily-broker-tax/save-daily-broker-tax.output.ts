import type { DailyBrokerTaxItemOutput } from '../list-daily-broker-taxes/list-daily-broker-taxes.output';

export type SaveDailyBrokerTaxOutput = {
  tax: DailyBrokerTaxItemOutput;
  recalculatedTickers: string[];
};
