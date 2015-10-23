var Client = require("./client");
var Info = require("./info");
var Host = require("./host");
var dgram = require("dgram");
var _ = require("../utils");
var UDPClient;

UDPClient = Client.extend(
    {
        constructor: function(options) {
            // call super
            Client.prototype.constructor.apply(this, arguments);

            this.hosts = [];
            this.lastHealthCheck = -1;
            this.activeHost = null;
        },

        addHost: function(host) {
            assert(host instanceof Host, "Host is expected");
            this.hosts.push(host);
        },

        /**
         * @abstract
         */
        ping: function() {
            var self = this;

            return _.any(this.hosts.map(function(host) {
                return self
                    ._isHostAlive(host)
                    .then(function(info) {
                        return {
                            info: new Info(),
                            host: host
                        };
                    });
            }));
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
            // udp read "A Note about UDP datagram size" @ https://nodejs.org/api/dgram.html
            // https://ru.wikipedia.org/wiki/Maximum_transmission_unit
        },

        getHost: function() {
            var self = this,
                findHost;

            if (!this.activeHost || (this.lastHealthCheck + this.options.health_check_duration) <= Date.now()) {
                findHost = _
                    .any(this.hosts.map(function(host) {
                        return self
                            ._isHostAlive(host)
                            .then(function(alive) {
                                if (!alive) {
                                    return Promise.reject();
                                }

                                return host;
                            });
                    }))
                    .then(function(host) {
                        self.activeHost = host;
                        self.lastHealthCheck = Date.now();

                        return host;
                    });
            } else {
                findHost = Promise.resolve(this.activeHost);
            }

            return findHost;
        },

        _isHostAlive: function(host) {
            var self = this;

            return new Promise(function(resolve, reject) {
                var socket = dgram.createSocket({
                    type: self.options.type
                });

                socket.send(new Buffer(""), 0, 0, host.port, host.host, function(err) {
                    if (err) {
                        if (err.code == 'ENOTFOUND') {
                            return resolve(false);
                        }

                        return reject(err);
                    }

                    resolve(true);
                });
            });
        }
    },

    {
        DEFAULTS: _.extend({}, Client.DEFAULTS, {
            type: "udp4",
            max_batch: 1000,
            health_check_duration: 1000 * 60 * 30 // every 30 minutes
        })
    }
);

module.exports.UDPClient = UDPClient;


