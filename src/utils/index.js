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

export function promisify(fn) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.apply(
        this,
        args.concat((err, value) => (err ? reject(err) : resolve(value)))
      );
    });
  };
}

export function promisifyMethods(target, methods) {
  return methods.reduce((output, method) => {
    output[method] = promisify.call(target, target[method]);
    return output;
  }, {});
}

export function getNetworkName(networkId) {
  const result = networks.filter(n => n.networkId === networkId);

  if (result.length < 1) {
    throw new Error('No network with ID ' + networkId + ' found.');
  }

  return result[0].name;
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
