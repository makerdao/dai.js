export function promisifyAsync(fn) {
  return function () {
    var args = [].slice.call(arguments);

    return new Promise((resolve, reject) => {
      fn.apply(this, args.concat((e, r) => {
        if (e) { reject(e); }
        else { resolve(r); }
      }));
    });
  };
}
