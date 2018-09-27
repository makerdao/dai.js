// decorator definition
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
      // outer promise to become valid
      await 0;

      // if there's already a promise, reuse it instead of setting this one--
      // this allows the function we're running to behave differently when
      // it's called directly vs. by another function. e.g. lockWeth
      if (!options.promise) options.promise = promise;

      const newArgs = [...args, options];
      const inner = original.apply(this, newArgs);
      // log(`inner reference to wrapper promise: ${uniqueId(promise)}`);
      return inner;
    })();

    // log(`wrapper promise: ${uniqueId(promise)}`);
    return promise;
  };
  return descriptor;
}
