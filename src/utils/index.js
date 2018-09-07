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

export function wrapContract(contract, name, abi, txManager) {
  const nonConstantFns = {};
  for (let { type, constant, name, inputs } of abi) {
    if (type === 'function' && constant === false) {
      // Map all of the contract method names + sigs in cases where the method sig is used
      // as the key to call the func. e.g. contract["method(address,uint256)"](foo, bar)
      // for when there are multiple overloaded methods
      if (inputs.length > 0) {
        const methodSig = `${name}(${inputs.map(i => i.type).join(',')})`;
        nonConstantFns[methodSig] = true;
      }
      // Currently assume that the default method chosen by Ethers when there
      // are multiple overloaded methods of the same name is non-constant
      nonConstantFns[name] = true;
    }
  }
  // The functions in ethers.Contract are set up as read-only, non-configurable
  // properties, which means if we try to change their values with Proxy, we
  // get an error. See https://stackoverflow.com/a/48495509/56817 for more
  // detail.
  //
  // But that only happens if the contract is specified as the first argument
  // to Proxy. So we don't do that. Go on, wag your finger.
  const proxy = new Proxy(
    {},
    {
      get(target, key) {
        if (nonConstantFns[key] && txManager) {
          return (...args) => {
            return txManager.formatHybridTx(contract, key, args, name);
          };
        }

        return contract[key];
      },

      set(target, key, value) {
        contract[key] = value;
        return true;
      }
    }
  );

  return proxy;
}
