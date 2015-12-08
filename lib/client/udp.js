var NetClient = require("./net").NetClient;
var Batch = require("../batch").Batch;
var Info = require("./info").Info;
var assert = require("assert");
var Udp = require("../net/udp/udp").Udp;
var _ = require("../utils");
var UdpClient;

/**
 * @class UdpClient
 * @extends NetClient
 */
UdpClient = NetClient.extend(
    /**
     * @lends HttpClient.prototype
     */
    {
        constructor: function(options) {
            NetClient.prototype.constructor.apply(this, arguments);

            if (!_.isUndefined(options.safe_limit)) {
                assert(_.isNumber(options.safe_limit), "options.safe_limit is expected to be a number");
            }
        },

        injectUdp: function(udp) {
            assert(udp instanceof Udp, "Udp is expected");
            this.udp = udp;
        },

        ping: function() {
            return this.elector.getHost()
                .then(function(host) {
                    return {
                        info: new Info(),
                        host: host
                    };
                });
        },

        query: function() {
            return Promise.reject("Query is not allowed in udp client");
        },

        write: function(batch) {
            var self = this;

            assert(batch instanceof Batch, "Batch is expected");

            return Promise
                .all(batch.measurements().map(function(measurement) {
                    // todo serialize here with batch.precision
                    // todo @see https://godoc.org/github.com/influxdb/influxdb/client/v2#Point.PrecisionString
                    return self.serializer.serialize(measurement);
                }))
                .then(function(lines) {
                    var buffers = [];
                    buffers.push(lines.reduce(function(buf, line) {
                        var append;

                        if (!buf) {
                            return new Buffer(line);
                        }

                        append = new Buffer("\n" + line);

                        if ((buf.length + append.length) > self.options.safe_limit) {
                            buffers.push(buf);
                            return new Buffer(line);
                        }

                        return Buffer.concat([buf, append]);
                    }, null));

                    return Promise.all(buffers.map(function(buf) {
                        return self.elector
                            .getHost()
                            .then(function(host) {
                                return self.udp.send(host.host, host.port, buf, 0, buf.length);
                            });
                    }));
                });
        }
    },

    {
        DEFAULTS: _.extend({}, NetClient.DEFAULTS, {
            safe_limit: 512 // bytes
        })
    }
);

module.exports.UdpClient = UdpClient;
