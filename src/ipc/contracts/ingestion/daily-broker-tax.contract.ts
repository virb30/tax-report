export type DailyBrokerTaxItem = {
  date: string;
  brokerId: string;
  brokerCode: string;
  brokerName: string;
  fees: number;
  irrf: number;
};

export type ListDailyBrokerTaxesResult = {
  items: DailyBrokerTaxItem[];
};

export type SaveDailyBrokerTaxCommand = {
  date: string;
  brokerId: string;
  fees: number;
  irrf: number;
};

export type SaveDailyBrokerTaxResult = {
  tax: DailyBrokerTaxItem;
  recalculatedTickers: string[];
};

export type ImportDailyBrokerTaxesCommand = {
  filePath: string;
};

export type ImportDailyBrokerTaxesResult = {
  importedCount: number;
  recalculatedTickers: string[];
};

export type DeleteDailyBrokerTaxCommand = {
  date: string;
  brokerId: string;
};

export type DeleteDailyBrokerTaxResult = {
  deleted: boolean;
  recalculatedTickers: string[];
};
