import networks from '../../contracts/networks';

export function measure(cb, name, limit = 100) {
  const start = new Date().getTime(),
    result = cb(),
    duration = new Date().getTime() - start;

  if (duration > limit) {
    console.error((name || 'Callback') + ' took ' + duration + ' ms.');
  } else {
    console.log((name || 'Callback') + ' took ' + duration + ' ms.');
  }

  return result;
}

let start = null, lastName = 'Timer';
export const watch = {
  start: (name = 'Timer') => {
    start = new Date().getTime();
    lastName = name;
    console.warn(name + ' START');
  },
  log: (label) => {
    console.warn(lastName + ' LOG: ' + (label ? label + ' ': '') + (new Date().getTime() - (start || new Date().getTime())) + 'ms.');
  },
  pass: (label) => {
    return (result) => {
      console.warn(lastName + ' LOG: ' + (label ? label + ' ': '') + (new Date().getTime() - (start || new Date().getTime())) + 'ms.');
      return result;
    }
  },
  end: () => {
    console.warn(lastName + ' END: ' + (new Date().getTime() - (start || new Date().getTime())) + 'ms.');
    start = undefined;
    lastName = 'Timer';
  }
};

export function promisifyAsync(fn) {
  return function() {
    let args = [].slice.call(arguments);

    return new Promise((resolve, reject) => {
      fn.apply(
        this,
        args.concat((e, r) => {
          if (e) {
            reject(e);
          } else {
            resolve(r);
          }
        })
      );
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
