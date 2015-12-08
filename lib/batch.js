var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");
var Measurement = require("./measurement").Measurement;
var precision = require("./precision");
var consistency = require("./consistency");
var Batch;

/**
 * @class Batch
 * @constructor
 */
Batch = function(attrs) {
    if (!_.isUndefined(attrs)) {
        assert(_.isObject(attrs), "Object is expected");

        var db = attrs.database;
        if (!_.isUndefined(db)) {
            assert(_.isString(db), "String is expected");
            this.database = db;
        }

        var rp = attrs.rp;
        if (!_.isUndefined(rp)) {
            assert(_.isString(rp), "String is expected");
            this.rp = rp;
        }

        var p = attrs.precision;
        if (!_.isUndefined(p)) {
            assert(_.isString(p), "String is expected");
            assert(precision.isValid(p), "precision is expected to be one of " + precision.VALUES);
            this.precision = p;
        }

        var c = attrs.consistency;
        if (!_.isUndefined(c)) {
            assert(_.isString(c), "String is expected");
            assert(consistency.isValid(c), "consistency is expected to be one of " + consistency.VALUES);
            this.consistency = c;
        }
    }

    this.list = [];
};

Batch.prototype = {
    constructor: Batch,

    add: function(measurement) {
        assert(measurement instanceof Measurement, "Measurement is expected");
        this.list.push(measurement);
    },

    measurements: function() {
        return this.list;
    },

    options: function() {
        var self = this;

        return [
            "database",
            "precision",
            "rp",
            "consistency"
        ].reduce(function(result, attr) {
            var value = self[attr];
            if (!_.isUndefined(value)) {
                result[attr] = value;
            }

            return result;
        }, {});
    }
};

Batch.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Batch = Batch;
