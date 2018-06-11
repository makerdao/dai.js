module.exports = function() {
  /* eslint-disable */
  process.on('unhandledRejection', err => {
    console.error('Unhandled rejection is:', err);
  });

  console.log('\nInstalled unhandledRejection logger.');
};
