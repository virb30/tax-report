export type DailyBrokerTaxItemOutput = {
  date: string;
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  fees: number;
  irrf: number;
};

export type ListDailyBrokerTaxesOutput = {
  items: DailyBrokerTaxItemOutput[];
};
