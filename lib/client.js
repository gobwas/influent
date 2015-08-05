var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");
var precision = require("./precision");

/**
 * @abstract
 */
function Client(options) {
    assert(_.isObject(options),          "options is expected to be an Object");
    assert(_.isString(options.username), "options.username is expected to be a string");
    assert(_.isString(options.password), "options.password is expected to be a string");
    assert(_.isString(options.database), "options.database is expected to be a string");

    precision.assert(options.precision, true, "options.precision is expected to be null or one of %values%");
    precision.assert(options.epoch, true, "options.epoch is expected to be null or one of %values%");

    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}


Client.prototype = {
    constructor: Client,

    /**
     * @abstract
     */
    query: function(query) {
        throw new TypeError("Method 'query' must be implemented");
    },

    /**
     * @abstract
     */
    check: function() {
        var self = this;

        return this
            .query("show databases")
            .then(function(response) {
                var index;

                index = _.flatten(response.results[0].series[0].values).indexOf(self.options.database);

                if (index == -1) {
                    throw new Error("Database not found: \"" + self.options.database +  "\"");
                }
            });
    },

    /**
     * @abstract
     */
    writeOne: function(measurement) {
        throw new TypeError("Method 'writeOne' must be implemented");
    },

    /**
     * @abstract
     */
    writeMany: function(measurements) {
        throw new TypeError("Method 'writeMany' must be implemented");
    }
};

Client.DEFAULTS = {
    precision: null,
    epoch:     null
};

Client.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Client = Client;
