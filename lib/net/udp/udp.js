var inherits = require("inherits-js");
var _ = require("../../utils");
var assert = require("assert");

/**
 * @abstract
 */
function Udp(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}

Udp.prototype = {
    constructor: Udp,

    /**
     * @abstract
     */
    send: function(address, port, buf, offset, length) {
        throw new TypeError("Method 'send' must be implemented");
    }
};

Udp.DEFAULTS = {};

Udp.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Udp = Udp;
