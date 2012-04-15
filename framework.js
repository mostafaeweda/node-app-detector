
"use strict";

var Path = require('path');
var Async = require('async');
var child_process = require('child_process');
var Fs = require('fs');
var ZipUtil = require('./zip_util');

var DEFAULT_MEM = '256M';

var FRAMEWORKS = {
    'Rails'     : {id: 'rails', mem: '256M', description: 'Rails Application'},
    'Spring'    : {id: 'spring', mem: '512M', description: 'Java SpringSource Spring Application'},
    'Grails'    : {id: 'grails', mem: '512M', description: 'Java SpringSource Grails Application'},
    'Lift'      : {id: 'lift', mem: '512M', description: 'Scala Lift Application'},
    'JavaWeb'   : {id: 'java_web', mem: '512M', description: 'Java Web Application'},
    'Sinatra'   : {id: 'sinatra', mem: '128M', description: 'Sinatra Application'},
    'Node'      : {id: 'node', mem: '64M', description: 'Node.js Application'},
    'PHP'       : {id: 'php', mem: '128M', description: 'PHP Application'},
    'WSGI'      : {id: 'wsgi', mem: '64M', description: 'Python WSGI Application'},
    'Django'    : {id: 'django', mem: '128M', description: 'Python Django Application'},
    'Rack'      : {id: 'rack', mem: '128M', description: 'Rack Application'}
};

module.exports = {

    DEFAULT_MEM: DEFAULT_MEM,

    FRAMEWORKS: FRAMEWORKS,

    detect: function(dir, detection_callback) {
        var contents;
        var files;


        // Find files only (ignore directories)
        child_process.exec('find . -type f', { cwd: dir }, function (err, stdout, stderr) {
            if (err) return detection_callback(err);

            contents = stdout || "";
            files = contents.split("\n");

            var proceed = null;

            var checkers = [railsCheck, rackCheck, javaCheck, sinatraCheck, nodeCheck, phpCheck, djangoCheck, WSGI_Check];
            var detected = false;

            Async.forEachSeries(checkers, function(checker, next) {
                if (detected) // skip if already detected
                  return next();

                checker(function(err, which, exec) {
                    proceed = { error: err, framework: which, exec: exec };
                    detected = err || which;
                    next(err, which);
                });
            }, function (err, result) {
                if (err)
                    return detection_callback(err);
                else if (! proceed.framework)
                    return detection_callback(); // can't determine application type

                var framework = clone(FRAMEWORKS[proceed.framework]);
                framework.exec = proceed.exec || framework.exec;
                detection_callback(null, framework);
          });
        });
        
        // Rails apps
        function railsCheck(callback) {
            Path.exists(Path.join(dir, 'config/environment.rb'), function (exists) {
                if (exists)
                  callback(null, 'Rails');
                else
                  callback();
            });
        }

        // Rack apps
        function rackCheck(callback) {
            Path.exists(Path.join(dir, 'config.ru'), function (exists) {
                if (exists)
                    callback(null, 'Rack');
                else
                  callback();
            });
        }

        // Java apps check
        function javaCheck(callback) {

            // Utility function to get the java app file
            function getJavaAppContents(result, callback) {
                if (result.warfile) {
                    ZipUtil.entry_lines(result.warfile, function(err, war_contents) {
                        callback(war_contents);
                    });
                } else {
                    callback(contents);
                }
            }

            // Java
            Async.parallel({
                warfile: function(callback) {
                    Fs.readdir(dir, function(err, list) {
                        if (err) return callback(err);

                        list = list.filter(function(f) {
                            return /\.war$/.test(f);
                        });
                        if (list.length !== 1)
                          return callback();

                        callback(null, Path.join(dir, list[0]));
                    });
                },
                webxml: function(callback) {
                    Path.exists(Path.join(dir, 'WEB-INF/web.xml'), function(exists) {
                        callback(null, exists);
                    });
                }
            }, function(err, result) {
                if (result.warfile || result.webxml) {
                    // This is a java app
                    // Now we determine what type of java app this is
                    getJavaAppContents(result, function(app_contents) {
                        if (/WEB-INF\/lib\/grails-web.*\.jar/.test(app_contents)) {
                            callback(null, 'Grails');
                        } else if (/WEB-INF\/lib\/lift-webkit.*\.jar/.test(app_contents)) {
                            callback(null, 'Lift');
                        } else if (/WEB-INF\/classes\/org\/springframework/.test(app_contents)
                                || /WEB-INF\/lib\/spring-core.*\.jar/.test(app_contents)
                                || /WEB-INF\/lib\/org\.springframework\.core.*\.jar/.test(app_contents)) {
                            callback(null, 'Spring');
                        } else {
                            callback(null, 'JavaWeb');
                        }
                    });
                }
                else {
                    callback();
                }
            });
        }

        // Simple Ruby Apps
        function sinatraCheck(callback) {

            Async.detectSeries(files, function(file, next) {
                if (! /\.rb$/.test(file))
                    return next();

                Fs.readFile(Path.join(dir, file), function(err, str) {
                    if (err || (! /^\s*require[\s\(]*['"]sinatra['"]/.test(str)))
                        return next();

                    next(true);
                });
            }, function(file) {
                if (! file) return callback();

                callback(null, 'Sinatra', 'ruby ' + file);
            });
        }

        // Node.JS
        function nodeCheck(callback) {

            // Check all possible detection files
            var files = ['server.js', 'app.js', 'index.js', 'main.js'].map(function(file) {
                return Path.join(dir, file);
            });
            Async.detectSeries(files, Path.exists, function (file) {
                if (! file) return callback();

                callback(null, 'Node', 'node ' + file);
            });
        }

        function phpCheck(callback) {
            var found = files.some(function (file) {
                return file.toLowerCase().lastIndexOf('.php') === (file.length - 4)
            });
            if (! found)
               return callback();
  
            callback(null, 'PHP');
        }

        function djangoCheck (callback) {
            Path.exists(Path.join(dir, 'manage.py'), function (exists) {
                if (exists)
                    callback(null, 'Django');
                else
                  callback();
            });
        }

        function WSGI_Check (callback) {
            Path.exists(Path.join(dir, 'wsgi.py'), function (exists) {
                if (exists)
                    callback(null, 'WSGI');
                else
                  callback();
            });
        }
    }
};

// Utilities

function clone(obj) {
    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        var copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        var copy = [];
        for (var i = 0, len = obj.length; i < len; ++i) {
            copy[i] = clone(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        var copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}