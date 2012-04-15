/**
 * Integration tests on the CloudFoundry public cloud
 * this actually requires node-native-zip, sinon & asyncjs
 */

"use strict";

var assert = require("assert");
var asyncjs = require("asyncjs");

var Path = require("path");
var Fs = require("fs");
var Framework = require('./framework');

// Execution ORDER: test.setUpSuite, setUp, testFn, tearDown, test.tearDownSuite
module.exports = {
    
    samplesDir: null,

    setUpSuite: function (next) {
        this.samplesDir = Path.join(__dirname, 'samples');
        next();
    },

    setUp: function(next) {
        next();
    },

    tearDown: function(next) {
        next();
    },

    "test rails" : function(next) {
        Framework.detect(Path.join(this.samplesDir, 'rails_app'), function (err, framework) {
            assert.equal(err, null);
            assert.notEqual(framework, null);
            assert.equal(framework.id, 'rails');
            next();
        });
    },

    "test rack" : function(next) {
        Framework.detect(Path.join(this.samplesDir, 'rack_app'), function (err, framework) {
            assert.equal(err, null);
            assert.notEqual(framework, null);
            assert.equal(framework.id, 'rack');
            next();
        });
    },

    "test sinatra" : function(next) {
        Framework.detect(Path.join(this.samplesDir, 'sinatra_app'), function (err, framework) {
            assert.equal(err, null);
            assert.notEqual(framework, null);
            assert.equal(framework.id, 'sinatra');
            next();
        });
    }
};


!module.parent && asyncjs.test.testcase(module.exports, "Framework").exec();