export function wrapContract(contract, name, abi, txManager) {
  const nonConstantFns = {};
  for (let { type, constant, name, inputs, stateMutability } of abi) {
    // Non-constant functions can modify state
    const canModifyState =
      constant === false || !['pure', 'view'].includes(stateMutability);
    if (type === 'function' && canModifyState) {
      // Map all of the contract method names + sigs in cases where the method
      // sig is used as the key due to method overloading, e.g.
      // contract["method(address,uint256)"](foo, bar)
      if (inputs.length > 0) {
        const methodSig = `${name}(${inputs.map(i => i.type).join(',')})`;
        nonConstantFns[methodSig] = true;
      }
      // Currently assume that the default method chosen by Ethers when there
      // are multiple overloaded methods of the same name is non-constant
      nonConstantFns[name] = true;
    }
  }

  // Why is the first argument an almost-empty object? The functions in
  // ethers.Contract are set up as read-only, non-configurable properties, which
  // means if we try to change their values with Proxy, we get an error.
  //
  // But that only happens if the contract is specified as the first argument to
  // Proxy. So we don't do that. Go on, wag your finger.
  //
  // See https://stackoverflow.com/a/48495509/56817 for more explanation.
  const proxy = new Proxy(
    {
      // this is handy for testing, but probably shouldn't be used for anything
      // else
      wrappedContract: contract
    },
    {
      get(target, key) {
        if (key in target) return target[key];
        if (!txManager || !nonConstantFns[key]) return contract[key];

        return (...args) => {
          for (const fnKey in contract.interface.functions) {
            if (contract.interface.functions[fnKey].name === key) {
              const lastArg = args[args.length - 1];

              // If the last arg is an object with a promise key, don't count it
              const functionInputsLength = lastArg?.promise
                ? args.length - 1
                : args.length;

              //TODO: do I want to do it this way?
              if (
                contract.interface.functions[fnKey].inputs.length ===
                functionInputsLength
              )
                key = fnKey;
              //TODO DD: make sure passing args doesnt change data even though we know its empty
            }
          }
          return txManager.sendContractCall(contract, key, args, name);
        };
      },

      set(target, key, value) {
        contract[key] = value;
        return true;
      }
    }
  );

  return proxy;
}
