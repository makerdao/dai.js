let addedLogger = false;

module.exports = function() {
  if (!addedLogger) {
    /* eslint-disable */
    process.on('unhandledRejection', err => {
      console.error('Unhandled rejection is:', err);
    });

    console.log('\nInstalled unhandledRejection logger.');
    addedLogger = true;
  }
};
