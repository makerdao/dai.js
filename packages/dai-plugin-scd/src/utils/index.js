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

// https://stackoverflow.com/a/43963612/56817
export const uniqueId = (() => {
  let currentId = 0;
  const map = new WeakMap();

  return object => {
    if (!map.has(object)) {
      map.set(object, ++currentId);
    }

    return map.get(object);
  };
})();
