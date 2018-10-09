var chokidar = require('chokidar');

var log = console.log.bind(console);
var watcher = chokidar.watch('.', {
  ignored: /[\/\\]\./, persistent: true
});

watcher
  .on('ready', function() { log(`loaded files, watching`); })
  .on('add', function(path) { log(`added ${path}`); })
  .on('change', function(path) { log(`changed ${path}`); })
  .on('unlink', function(path) { log(`deleted ${path}`); });

