import { callGanache } from 'test-helpers';

export async function takeSnapshot(maker) {
  let snapshotData = {};
  const res = await callGanache('evm_snapshot');
  const { result } = await res.json();
  snapshotData.snapshotId = parseInt(result, 16);

  if (maker) {
    const nonceService = maker.service('nonce');
    const currentAddress = maker.service('web3').currentAddress();
    snapshotData.transactionCount = nonceService._counts[currentAddress];
  }

  return snapshotData;
}

export async function restoreSnapshot(snapshotData, maker) {
  const res = await callGanache('evm_revert', [snapshotData.snapshotId]);

  if (maker && snapshotData.transactionCount) {
    const currentAddress = maker.service('web3').currentAddress();
    maker.service('nonce')._counts[currentAddress] =
      snapshotData.transactionCount;
  }

  return (await res.json()).result;
}
