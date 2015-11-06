var Udp = require("./udp").Udp;
var assert = require("assert");
var _ = require("../../utils");
var dgram = require("dgram");
var dns = require("dns");

/**
 * @class NodeUdp
 * @extends Udp
 */
NodeUdp = Udp.extend(
    /**
     * @lends NodeUdp.prototype
     */
    {
        send: function(host, port, buf, offset, length) {
            assert(_.isString(host), "Host is expected to be a string");

            return this._lookup(host)
                .then(function(def) {
                    return new Promise(function(resolve) {
                        var socket = dgram.createSocket(def.family == 4 ? "udp4" : "udp6");
                        socket.send(buf, offset, length, port, def.address, resolve);
                    });
                });
        },

        _lookup: function(host) {
            return new Promise(function(resolve, reject) {
                dns.lookup(host, function(err, address, family) {
                    if (err) {
                        return reject(err);
                    }

                    resolve({
                        address: address,
                        family:  family
                    });
                });
            });
        }
    }
);

exports.NodeUdp = NodeUdp;
