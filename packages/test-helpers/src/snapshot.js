import callGanache from './callGanache';

export async function takeSnapshot(maker) {
  let snapshotData = {};
  const res = await callGanache('evm_snapshot');
  const { result } = await res.json();
  snapshotData.snapshotId = parseInt(result, 16);

  if (maker) {
    const nonceService = maker.service('nonce');
    const web3Service = maker.service('web3');
    const addresses = maker
      .service('accounts')
      .listAccounts()
      .map(account => account.address);
    snapshotData.transactionCounts = addresses.reduce((acc, address) => {
      acc[address] = nonceService._counts[address];

      return acc;
    }, {});

    snapshotData.currentBlock = web3Service.blockNumber();
  }

  return snapshotData;
}

export async function restoreSnapshot(snapshotData, maker) {
  const res = await callGanache('evm_revert', [snapshotData.snapshotId]);

  if (maker && snapshotData.transactionCounts) {
    Object.keys(maker.service('nonce')._counts).forEach(address => {
      maker.service('nonce')._counts[address] =
        snapshotData.transactionCounts[address] || undefined;
    });
  }

  if (maker && snapshotData.currentBlock) {
    maker.service('web3')._currentBlock = snapshotData.currentBlock;
  }

  return (await res.json()).result;
}
