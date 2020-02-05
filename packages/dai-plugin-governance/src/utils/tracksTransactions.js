// FIXME this is a duplicate of the file in the main dai.js source -- it should
// be moved to a utility library or something, but for now, this is the simplest
// way to avoid any issues with importing

import times from 'lodash/times';

/*

The default export is a decorator definition.

If a function is decorated with `@tracksTransactions`, it should expect its last
argument to be an object with a key named `promise`. It should pass that
`promise` argument along as a key in the last argument to any non-constant
function calls it makes to a smart contract (i.e. an instance returned from the
getContract method in SmartContractService), or any calls it makes to other
functions that will eventually call such smart contract functions.

This allows TransactionManager to let users input a promise and attach lifecycle
callbacks to all transactions that were created in the course of executing that
promise.

@tracksTransactions is only necessary when the function is async. If the
function returns a contract call and does not make any async calls before that,
then the async keyword can be removed, and it just needs to have an `options`
argument that it passes to its contract call.

If you need to apply this to a function that has any arguments with default
values, use `@tracksTransactionsWithOptions({ numArguments })` instead, where
`numArguments` is the total number of arguments to the function, including the
last object which contains a key named `promise`.

*/

const tracksTransactions = tracksTransactionsWithOptions({});
export default tracksTransactions;

export function tracksTransactionsWithOptions({ numArguments }) {
  return (target, name, descriptor) => {
    const original = descriptor.value;
    const correctArgsLength = numArguments || original.length;
    descriptor.value = function(...args) {
      const last = args[args.length - 1];
      let options;
      if (
        typeof last === 'object' &&
        last !== null &&
        last.constructor === Object
      ) {
        args = args.slice(0, args.length - 1);
        options = last;
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

        // pad the list of arguments with `undefined` to account for any missing
        // ones with default values.
        const newArgs = [
          ...args,
          ...times(correctArgsLength - 1 - args.length, () => undefined),
          options
        ];

        return original.apply(this, newArgs);
      })();
      return promise;
    };
    return descriptor;
  };
}
