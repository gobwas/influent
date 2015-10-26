var NetClient = require("./net").NetClient;
var Info = require("./info");
var Host = require("./host");
var dgram = require("dgram");
var _ = require("../utils");
var UDPClient;

/**
 * @class UDPClient
 * @extends NetClient
 */
UDPClient = NetClient.extend(
    /**
     * @lends HttpClient.prototype
     */
    {
        ping: function() {
            var self = this;

            return this.elector.getHost(this.hosts)
                .then(function(host) {
                    return {
                        info: new Info(),
                        host: host
                    };
                });
        },

        query: function(query) {
            return Promise.reject('Query is not allowed in UDP client');
        },

        writeOne: function(measurement, options) {
            assert(measurement instanceof Measurement, "Measurement is expected");
            return this.writeMany([ measurement ], options);
        },

        writeMany: function(measurements) {
            // todo
            // influx accepts up to 64KB
            // 512b is safer
        }
    },

    {
        DEFAULTS: _.extend({}, NetClient.DEFAULTS, {
            type: "udp4",
            max_batch: 1000,
            safe_limit: 512, // bytes
            health_check_duration: 1000 * 60 * 30 // every 30 minutes
        })
    }
);

module.exports.UDPClient = UDPClient;


