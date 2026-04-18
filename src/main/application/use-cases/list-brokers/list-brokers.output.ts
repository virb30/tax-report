export interface BrokerOutput {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
};

export interface ListBrokersOutput {
  items: BrokerOutput[];
};
