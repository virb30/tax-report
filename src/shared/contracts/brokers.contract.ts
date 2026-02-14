export type BrokerListItem = {
  id: string;
  name: string;
  cnpj: string;
  code: string;
};

export type ListBrokersResult = {
  items: BrokerListItem[];
};

export type CreateBrokerCommand = {
  name: string;
  cnpj: string;
  code: string;
};

export type CreateBrokerResult =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };
