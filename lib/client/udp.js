var NetClient = require("./net").NetClient;
var Host = require("./host").Host;
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

            if (!_.isUndefined(options.max_batch)) {
                assert(_.isNumber(options.max_batch), "options.max_batch is expected to be a number");
            }

            if (!_.isUndefined(options.safe_limit)) {
                assert(_.isNumber(options.safe_limit), "options.safe_limit is expected to be a number");
            }
        },

        injectUdp: function(udp) {
            assert(udp instanceof Udp, "Udp is expected");
            this.udp = udp;
        },

        ping: function() {
            var self = this;

            return this.elector.getHost()
                .then(function(host) {
                    return {
                        info: new Info(),
                        host: host
                    };
                });
        },

        query: function(query) {
            return Promise.reject("Query is not allowed in udp client");
        },

        write: function(measurements, options) {
            var self = this;
            var config = _.extend({}, this.options);

            options = options || {};

            // allow to overwrite base max_batch
            if (!_.isUndefined(options.max_batch)) {
                assert(_.isNumber(options.max_batch) && options.max_batch > 0,  "options.max_batch is expected to be a number > 0");
                config.max_batch = options.max_batch;
            }

            // allow to overwrite base safe_limit
            if (!_.isUndefined(options.safe_limit)) {
                assert(_.isNumber(options.safe_limit) && options.safe_limit > 0,  "options.safe_limit is expected to be a number > 0");
                config.safe_limit = options.safe_limit;
            }

            return Promise.all(
                _
                    .chunks(measurements, config.max_batch)
                    .map(function(measurements) {
                        return Promise
                            .all(measurements.map(function(measurement) {
                                return self.serializer.serialize(measurement);
                            }))
                            .then(function(lines) {
                                var buffers = [];
                                buffers.push(lines.reduce(function(buf, line) {
                                    var str = "\n" + line;

                                    if (!buf) {
                                        return new Buffer(line);
                                    }

                                    if ((buf.length + Buffer.byteLength(str)) > config.safe_limit) {
                                        buffers.push(buf);
                                        return new Buffer(line);
                                    }

                                    return Buffer.concat([buf, new Buffer(str)]);
                                }, null));

                                return Promise.all(buffers.map(function(buf) {
                                    return self.elector
                                        .getHost()
                                        .then(function(host) {
                                            return self.udp.send(host.host, host.port, buf, 0, buf.length);
                                        });
                                }));
                            });
                    })
            );
        }
    },

    {
        DEFAULTS: _.extend({}, NetClient.DEFAULTS, {
            max_batch:  1000,
            safe_limit: 512, // bytes
        })
    }
);

module.exports.UdpClient = UdpClient;
