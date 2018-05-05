
if (!Promise.any) {
  Promise.any = function(promises) {
    return new Promise(function(resolve, reject) {
      let count = promises.length, resolved = false, errors = [];
      promises.forEach(function(p) {
        Promise.resolve(p).then(function(value) {
          resolved = true;
          count--;
          resolve(value);
        }, function(reason) {
          errors.push(reason);
          count--;
          if (count === 0 && !resolved) {
            reject(errors);
          }
        });
      });
    });
  };
}
