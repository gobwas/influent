var assert = require("assert");
var _ = require("./../utils");
var Info = require("./info").Info;

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

    this.info = null;
}

Host.prototype = {
    constructor: Host,

    updateInfo: function(info) {
        assert(info instanceof Info, "Info is expected");
        this.info = info;
    },

    toString: function() {
        return this.protocol + "://" + this.host + ":" + this.port;
    }
};

exports.Host = Host;