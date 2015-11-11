var inherits = require("inherits-js");
var _ = require("../../utils");
var Host = require("../host").Host;
var assert = require("assert");

/**
 * @abstract
 */
function Elector(hosts, options) {
    assert(_.isArray(hosts), "Array is expected");
    assert(hosts.length > 0, "Hosts should be not empty");
    hosts.forEach(function(host) {
        assert(host instanceof Host, "Host is expected");
    });

    this.hosts = hosts;

    this.options = _.extend({}, this.constructor.DEFAULTS, options);
    this.lastHealthCheck = -1;
    this.activeHost = null;
}

Elector.prototype = {
    constructor: Elector,

    /**
     * @abstract
     */
    getHost: function(hosts) {
        throw new TypeError("Method 'getHost' should be implemented");
    }
};

Elector.DEFAULTS = {
    period: 0
};

Elector.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Elector = Elector;
