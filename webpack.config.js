module.exports = function(env) {
  console.log(' WEBPACK ENV = ' + env);
  return require(`./conf/webpack.${env}.js`)
};