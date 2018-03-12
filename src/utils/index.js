import networks from '../../contracts/networks';

export function promisifyAsync(fn) {
  return function () {
    let args = [].slice.call(arguments);

    return new Promise((resolve, reject) => {
      fn.apply(this, args.concat((e, r) => {
        if (e) { reject(e); }
        else { resolve(r); }
      }));
    });
  };
}

export function promisifyAsyncMethods(target, methods) {
  let output = {};
  for (let method of methods) {
    output[method] = promisifyAsync.call(target, target[method]);
  }
  return output;
}

export function getNetworkName(networkId) {
  const result = networks.filter(n => n.networkId === networkId);

  if (result.length < 1) {
    throw new Error('No network with ID ' + networkId + ' found.');
  }

  return result[0].name;
}