var util = require('util');
var exec  = require('child_process').exec;

var PACK_EXCLUSION_GLOBS = ['..', '.', '*~', '#*#', '*.log', '.git/*']

var ZipUtil = module.exports = {

  pack: function(dir, zipfile, callback) {
    var excludes = PACK_EXCLUSION_GLOBS.map(function(e) { return '\\' + e; }).join(' ');
    var packCommand = 'zip -y -q -r "' + zipfile + '" . -x ' + excludes + ' 2> /dev/null';
    exec(packCommand, { cwd: dir },
      function (error, stdout, stderr) {
        if (error)
          console.error('exec error: ' + error);
        callback(error);
    });
    // Do NodeJS version if the native version failed
  },

  unpack: function(file, dest, callback) {
    var excludes = PACK_EXCLUSION_GLOBS.map(function(e) { return '\\' + e; }).join(' ');
    var unpackCommand = 'unzip -q "' + file + '" -d "' + dest + '" 2> /dev/null';
    exec(unpackCommand,
      function (error, stdout, stderr) {
        if (error)
          console.error('exec error: ' + error);
        callback(error);
    });
    // Do NodeJS version if the native version failed
  },

  entry_lines: function(file, callback) {
    var contents = null;
    var entryCommand = 'unzip -l "' + file + '" 2> /dev/null';
    exec(entryCommand,
      function (error, stdout, stderr) {
        if (error === null) {
          console.error('Entries: ' + stdout);
          callback(null, stdout);
        } else {
          console.error('exec error: ' + error);
          callback(error, null);
        }
    });
    // Do NodeJS version if the native version failed
  }
};