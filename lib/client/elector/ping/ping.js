var inherits = require("inherits-js");
var _ = require("../../../utils");
var assert = require("assert");

/**
 * @class Ping
 * @abstract
 */
function Ping(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}

/**
 * @abstract
 * @returns Promise
 */
Ping.prototype.pong = function(host) {
    throw new TypeError("Method 'pong' should be implemented");
};

Ping.extend = function(p, s) {
    return inherits(this, p, s);
};

Ping.DEFAULTS = {};

exports.Ping = Ping;
