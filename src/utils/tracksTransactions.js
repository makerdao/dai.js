// This is a decorator definition.
//
// If a function is decorated with `@tracksTransactions`, it should expect its
// last argument to be an object with a key named `promise`. It should pass that
// `promise` argument along as a key in the last argument to any non-constant
// function calls it makes to a smart contract (i.e. an instance returned from
// the getContractByX methods in SmartContractService), or any calls it makes to
// other functions that will eventually call such smart contract functions.
//
// This allows TransactionManager to let users input a promise and receive a
// list of all transactions that were created in the course of executing that
// promise, so that they may attach lifecycle callbacks to those transactions.
//
export default function tracksTransactions(target, name, descriptor) {
  const original = descriptor.value;
  descriptor.value = function(...args) {
    const lastArg = args[args.length - 1];
    let options;
    if (typeof lastArg === 'object' && lastArg.constructor === Object) {
      args = args.slice(0, args.length - 1);
      options = lastArg;
    } else {
      options = {};
    }

    const promise = (async () => {
      // this "no-op await" is necessary for the inner reference to the
      // outer promise to become valid.
      await 0;

      // if there's already a promise, reuse it instead of setting this one--
      // this allows the function we're running to behave differently when
      // it's called directly vs. by another function. e.g. lockWeth
      if (!options.promise) options.promise = promise;

      const newArgs = [...args, options];
      const inner = original.apply(this, newArgs);
      return inner;
    })();

    return promise;
  };
  return descriptor;
}
