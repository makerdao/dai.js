import { callGanache } from 'test-helpers';

export async function takeSnapshot() {
  const res = await callGanache('evm_snapshot');
  const { result } = await res.json();
  return parseInt(result, 16);
}

export async function restoreSnapshot(snapId) {
  const res = await callGanache('evm_revert', [snapId]);
  return (await res.json()).result;
}
