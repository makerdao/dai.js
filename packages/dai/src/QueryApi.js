import assert from 'assert';
import fetch from 'isomorphic-fetch';

export async function getQueryResponse(serverUrl, query, variables) {
  const resp = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const { data } = await resp.json();
  assert(data, `error fetching data from ${serverUrl}`);
  return data;
}
