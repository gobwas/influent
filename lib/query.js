var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");
var Measurement = require("./measurement");
var precision = require("./precision");
var consistency = require("./consistency");
var Query;

/**
 * @class Query
 * @constructor
 */
Query = function(command, attrs) {
    assert(_.isString(command), "String is expected");
    this.cmd = command;

    assert(_.isObject(attrs), "Object is expected");

    var db = attrs.database;
    if (!_.isUndefined(db)) {
        assert(_.isString(db), "String is expected");
        this.database = db;
    }

    var e = attrs.epoch;
    if (!_.isUndefined(e)) {
        assert(_.isString(e), "String is expected");
        assert(precision.isValid(e), "epoch is expected to be one of " + precision.VALUES);
        this.epoch = e;
    }

    var s = attrs.chunk_size;
    if (!_.isUndefined(s)) {
        assert(_.isNumber(s), "Number is expected");
        this.chunk_size = s;
    }
};

Query.prototype = {
    constructor: Query,

    command: function() {
        return this.cmd;
    },

    options: function() {
        var self = this;

        return [
            "database",
            "epoch",
            "chunk_size"
        ].reduce(function(result, attr) {
            var value = self[attr];
            if (!_.isUndefined(value)) {
                result[attr] = value;
            }

            return result;
        }, {});
    }
};

Query.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Query = Query;
