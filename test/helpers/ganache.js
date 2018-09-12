import fetch from 'node-fetch';

const ganacheAddress = 'http://localhost:2000';
let requestCount = 0;

function callGanache(method, params = []) {
  return fetch(ganacheAddress, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: requestCount++
    })
  });
}

export async function takeSnapshot() {
  const res = await callGanache('evm_snapshot');
  const { result } = await res.json();
  return parseInt(result, 16);
}

export async function restoreSnapshot(snapId) {
  const res = await callGanache('evm_revert', [snapId]);
  return (await res.json()).result;
}
