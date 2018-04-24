import transactionStatus from '../eth/TransactionState';

const TransactionType = {
  oasis: 'oasis',
  transaction: 'transaction'
};

const transactionLifeCycle = {
  initialized: [transactionStatus.pending, transactionStatus.error],
  pending: [transactionStatus.error, transactionStatus.mined],
  mined: [transactionStatus.finalized, transactionStatus.error],
  finalized: [],
  error: []
};

const transactionTypeTransitions = {
  transaction: transactionLifeCycle
};

export { TransactionType as default, transactionTypeTransitions };
