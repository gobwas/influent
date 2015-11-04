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
    	send: function(address, port, buf, offset, length) {
            assert(_.isString(address), "Address is expected to be a string");

            return this._lookup(address)
                .then(function(def) {
                    return new Promise(function(resolve) {
                        var socket = dgram.createSocket(def.family == 4 ? "udp4" : "udp6");
                        socket.send(buf, offset, length, port, address, resolve);
                    });
                });
    	},

        _lookup: function(address) {
            return new Promise(function(resolve, reject) {
                dns.lookup(address, function(err, address, family) {
                    if (err) {
                        return reject(err);
                    }

                    resolve({
                        address: address,
                        family: family
                    });
                });
            });
        }
    }
);

exports.NodeUdp = NodeUdp;