import networks from '../../contracts/networks';

export function captureConsole(cb) {
  // eslint-disable-next-line
  const origConsoleLog = console.log,
    output = [];

  // eslint-disable-next-line
  console.log = (...args) => args.forEach(a => output.push(a));

  cb();

  // eslint-disable-next-line
  console.log = origConsoleLog;
}

export function measure(cb, name, limit = 100) {
  const start = new Date().getTime(),
    result = cb(),
    duration = new Date().getTime() - start;

  if (duration > limit) {
    // eslint-disable-next-line
    console.error((name || 'Callback') + ' took ' + duration + ' ms.');
  } else {
    // eslint-disable-next-line
    console.log((name || 'Callback') + ' took ' + duration + ' ms.');
  }

  return result;
}

let start = null,
  lastName = 'Timer';
export const watch = {
  start: (name = 'Timer') => {
    start = new Date().getTime();
    lastName = name;
    // eslint-disable-next-line
    console.warn(name + ' START');
  },
  log: label => {
    // eslint-disable-next-line
    console.warn(
      lastName +
        ' LOG: ' +
        (label ? label + ' ' : '') +
        (new Date().getTime() - (start || new Date().getTime())) +
        'ms.'
    );
  },
  pass: label => {
    return result => {
      // eslint-disable-next-line
      console.warn(
        lastName +
          ' LOG: ' +
          (label ? label + ' ' : '') +
          (new Date().getTime() - (start || new Date().getTime())) +
          'ms.'
      );
      return result;
    };
  },
  end: () => {
    // eslint-disable-next-line
    console.warn(
      lastName +
        ' END: ' +
        (new Date().getTime() - (start || new Date().getTime())) +
        'ms.'
    );
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

export function eventIndexer() {
  let index = 0;
  return function() {
    index++;
    return index;
  };
}

export function slug() {
  return (
    '-' +
    Math.random()
      .toString(36)
      .substring(2, 7) +
    Math.random()
      .toString(36)
      .substring(2, 7)
  );
}

export function promiseWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
