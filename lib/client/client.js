var inherits = require("inherits-js");
var _ = require("./../utils");
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
     * @abstract
     */
    ping: function() {
        throw new TypeError("Method 'query' must be implemented");
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
