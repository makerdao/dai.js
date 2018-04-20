import oasisOrderStatus from './oasis/OasisOrderState';
import transactionStatus from '../eth/TransactionState';

const TransactionType = {
  oasis: 'oasis',
  transaction: 'transaction'
};

const oasisOrderLifeCycle = {
  initialized: [oasisOrderStatus.pending, oasisOrderStatus.error],
  pending: [oasisOrderStatus.error, oasisOrderStatus.mined],
  mined: [oasisOrderStatus.finalized, oasisOrderStatus.error],
  finalized: [],
  error: []
};

const transactionLifeCycle = {
  initialized: [transactionStatus.pending, transactionStatus.error],
  pending: [transactionStatus.error, transactionStatus.mined],
  mined: [transactionStatus.finalized, transactionStatus.error],
  finalized: [],
  error: []
};

const transactionTypeTransitions = {
  oasis: oasisOrderLifeCycle,
  transaction: transactionLifeCycle
};

export { TransactionType as default, transactionTypeTransitions };
