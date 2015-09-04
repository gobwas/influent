var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");

/**
 * @abstract
 */
function Client(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}


Client.prototype = {
    constructor: Client,

    /**
     * Checks if client could work with given options.
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
    query: function(query) {
        throw new TypeError("Method 'query' must be implemented");
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
