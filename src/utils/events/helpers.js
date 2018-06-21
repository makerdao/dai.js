import isEqual from 'lodash.isequal';

//////////////////////////////
/////  Polling Helpers  //////
//////////////////////////////

export function createPayloadFetcher(payloadGetterMap) {
  return () => {
    return Promise.all(
      Object.entries(payloadGetterMap).map(([key, getter]) =>
        getter().then(state => [key, state])
      )
    ).then(states => {
      const payload = {};
      for (const [key, state] of states) {
        payload[key] = state;
      }
      return payload;
    });
  };
}

export function createMemoizedPoll({
  type,
  getState,
  emit,
  curr = {},
  live = false
}) {
  return {
    async ping() {
      if (!live) return;
      try {
        const next = await getState();
        if (!isEqual(curr, next)) {
          emit(type, next);
          curr = next;
        }
      } catch (err) {
        const msg = `Failed to get latest ${type} state. Message -> ${err}`;
        emit('error', msg);
      }
    },
    async heat() {
      if (live) return;
      try {
        curr = await getState();
        live = true;
      } catch (err) {
        const msg = `Failed to get initial ${type} state. Message -> ${err}`;
        emit('error', msg);
      }
    },
    cool() {
      if (!live) return;
      live = false;
    },
    type() {
      return type;
    },
    live() {
      return live;
    }
  };
}
