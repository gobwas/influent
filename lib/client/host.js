var assert = require("assert");
var _ = require("./../utils");

/**
 * @class Host
 * @constructor
 * @final
 */
function Host(protocol, host, port) {
    assert(_.isString(protocol), "String is expected for protocol");
    assert(_.isString(host), "String is expected for host");
    assert(_.isNumber(port), "Number is expected for port");

    this.protocol = protocol;
    this.host = host;
    this.port = port;
}

Host.prototype = {
    constructor: Host,

    toString: function() {
        return this.protocol + "://" + this.host + ":" + this.port;
    }
};

exports.Host = Host;