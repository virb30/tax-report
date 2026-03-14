type BrokerListItem = {
  id: string;
  name: string;
  cnpj: string;
  code: string;
  active: boolean;
};

export type ListBrokersResult = {
  items: BrokerListItem[];
};

export type ListBrokersQuery = {
  activeOnly?: boolean;
};

export type UpdateBrokerCommand = {
  id: string;
  name?: string;
  cnpj?: string;
  code?: string;
};

export type UpdateBrokerResult =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };

export type ToggleBrokerActiveCommand = {
  id: string;
};

export type ToggleBrokerActiveResult =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };

export type CreateBrokerCommand = {
  name: string;
  cnpj: string;
  code: string;
};

export type CreateBrokerResult =
  | { success: true; broker: BrokerListItem }
  | { success: false; error: string };
