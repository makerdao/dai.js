import fetch from 'node-fetch';

const ganacheAddress = 'http://localhost:2000';
let requestCount = 0;

export default function callGanache(method, params = []) {
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
