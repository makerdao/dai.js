if (!Promise.any) {
  Promise.any = function(promises) {
    return new Promise(function(resolve, reject) {
      let count = promises.length,
        resolved = false,
        errors = [];
      promises.forEach(function(p) {
        Promise.resolve(p).then(
          function(value) {
            resolved = true;
            count--;
            resolve(value);
          },
          function(reason) {
            errors.push(reason);
            count--;
            if (count === 0 && !resolved) {
              reject(errors);
            }
          }
        );
      });
    });
  };
}

if (!String.prototype.padStart) {
  String.prototype.padStart = function padStart(targetLength, padString) {
    targetLength = targetLength >> 0; //floor if number or convert non-number to 0;
    padString = String(typeof padString !== 'undefined' ? padString : ' ');
    if (this.length > targetLength) {
      return String(this);
    } else {
      targetLength = targetLength - this.length;
      if (targetLength > padString.length) {
        padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
      }
      return padString.slice(0, targetLength) + String(this);
    }
  };
}
