var Value  = require("./value").Value;
var assert = require("assert");
var _      = require("./utils");


/**
 * @class Measurement
 * @constructor
 * @final
 *
 * @param {string} key
 */
function Measurement(key) {
    assert(_.isString(key), "String is expected");

    this.key = key;

    this.tags = {};
    this.fields = {};
    this.timestamp = null;
}

Measurement.prototype = {
    constructor: Measurement,

    addTag: function(key, value) {
        assert(_.isString(key), "String is expected");
        assert(_.isString(value), "String is expected");
        assert(this.tags.hasOwnProperty(key) == false, "Tag with key '" + key + "' is already set");

        this.tags[key] = value;

        return this;
    },

    addField: function(key, value) {
        assert(_.isString(key));
        assert(value instanceof Value, "Value is expected");
        assert(this.fields.hasOwnProperty(key) == false, "Field with key '" + key + "' is already set");

        this.fields[key] = value;

        return this;
    },

    setTimestamp: function(timestamp) {
        assert(_.isNumericString(timestamp), "Numeric string is expected :" + timestamp);
        this.timestamp = timestamp;
    }
};


exports.Measurement = Measurement;