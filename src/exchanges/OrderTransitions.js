import oasisOrderStatus from './oasis/oasisOrderState';

const OrderType = {
  oasis: 'oasis'
};

const oasisOrderLifeCycle = {
  initialized: [oasisOrderStatus.pending, oasisOrderStatus.error],
  pending: [oasisOrderStatus.error, oasisOrderStatus.confirmed],
  confirmed: [oasisOrderStatus.completed, oasisOrderStatus.error],
  completed: [],
  error: []
};

const orderTypeTransitions = {
  oasis: oasisOrderLifeCycle
};

export { OrderType as default, orderTypeTransitions };
