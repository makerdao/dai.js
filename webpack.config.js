module.exports = function(env) {
  return require(`./conf/webpack.${env}.js`)
}