var Client = require("./client").Client;
var Pong = require("./pong").Pong;
var Serializer = require("../serializer/serializer").Serializer;
var Measurement = require("../measurement").Measurement;
var Host = require("./host").Host;
var assert = require("assert");
var Http = require("hurl/lib/http").Http;
var _ = require("../utils");
var precision = require("../precision");
var HttpClient;

/**
 * @class HttpClient
 * @extends Client
 */
HttpClient = Client.extend(
    /**
     * @lends HttpClient.prototype
     */
    {
        /**
         *
         */
        constructor: function(options) {
            Client.prototype.constructor.apply(this, arguments);

            // required options assertions
            assert(_.isObject(options),          "options is expected to be an Object");
            assert(_.isString(options.username), "options.username is expected to be a string");
            assert(_.isString(options.password), "options.password is expected to be a string");
            assert(_.isString(options.database), "options.database is expected to be a string");

            // optional options assertions
            if (!_.isUndefined(options.max_batch)) {
                assert(_.isNumber(options.max_batch), "options.max_batch is expected to be a number");
            }
            if (!_.isUndefined(options.chunk_size)) {
                assert(_.isNumber(options.chunk_size), "options.chunk_size is expected to be a number");
            }
            precision.assert(options.precision, true, "options.precision is expected to be null or one of %values%");
            precision.assert(options.epoch, true, "options.epoch is expected to be null or one of %values%");

            this.hosts = [];
            this.lastHealthCheck = -1;
            this.lastHealth = [];
        },

        injectHttp: function(http) {
            assert(http instanceof Http, "Http is expected");
            this.http = http;
        },

        injectSerializer: function(serializer) {
            assert(serializer instanceof Serializer, "Serializer is expected");
            this.serializer = serializer;
        },

        addHost: function(host) {
            assert(host instanceof Host, "Host is expected");
            this.hosts.push(host);
        },

        getHost: function() {
            var self = this,
                checkHealth;

            if ((this.lastHealthCheck + this.options.health_check_duration) <= Date.now()) {
                checkHealth = this
                    .ping()
                    .then(function(health) {
                        self.lastHealthCheck = Date.now();
                        self.lastHealth = health;
                        return health;
                    })
            } else {
                checkHealth = Promise.resolve(this.lastHealth);
            }

            return checkHealth
                .then(function(health) {
                    var firstHealthy;

                    firstHealthy = _.findWhere(health, function(health) {
                        return health.status.ok;
                    });

                    if (!firstHealthy) {
                        throw new Error("Could not get healthy host");
                    }

                    return self.hosts[health.indexOf(firstHealthy)]
                });
        },

        ping: function() {
            var self = this;

            return Promise.all(
                this.hosts.map(function(host) {
                    return self.http
                        .request(host.toString() + "/ping", {
                            method: "HEAD"
                        })
                        .then(function(resp) {
                            var pong;

                            if (resp.statusCode == 204) {
                                pong = new Pong(true);
                                pong.setVersion(resp.headers["x-influxdb-version"]);
                                pong.setDate(new Date(resp.headers["date"]));
                            } else {
                                pong = new Pong(false);
                                pong.setInfo(resp.statusCode + ": " + resp.body);
                            }

                            return pong;
                        })
                        .catch(function(err) {
                            var pong;

                            if (err.code == "ECONNREFUSED") {
                                pong = new Pong(false);
                                pong.setInfo(err.code);

                                return pong;
                            }

                            throw err;
                        })
                        .then(function(pong) {
                            return {
                                host:   host,
                                status: pong
                            };
                        });
                })
            );
        },

        query: function(query, options) {
            var self = this;

            assert(_.isString(query), "String is expected");

            options = options || {};
            if (!_.isUndefined(options.chunk_size)) {
                assert(_.isNumber(options.chunk_size),  "options.chunk_size is expected to be a number");
            }
            precision.assert(options.epoch, true, "options.epoch is expected to be null or one of %values%");
            options = _.extend({}, this.options, _.pick(options, "epoch", "chunk_size"));

            return this
                .getHost()
                .then(function(host) {
                    var queryObj;

                    queryObj = {};

                    if (_.isString(options.epoch)) {
                        queryObj["epoch"] = options.epoch;
                    }

                    if (_.isNumber(options.chunk_size)) {
                        queryObj["chunk_size"] = options.chunk_size;
                    }

                    return self.http
                        .request(host.toString() + "/query", {
                            method: "GET",
                            auth: {
                                username: options.username,
                                password: options.password
                            },
                            query: _.extend(queryObj, {
                                db: options.database,
                                q:  query
                            })
                        })
                        .then(function(resp) {
                            if (resp.statusCode == 200) {
                                return JSON.parse(resp.body);
                            }

                            throw new Error("InfluxDB unsuccessful status code");
                        });
                });
        },

        writeOne: function(measurement, options) {
            assert(measurement instanceof Measurement, "Measurement is expected");
            return this.writeMany([ measurement ], options);
        },

        writeMany: function(measurements, options) {
            var self = this;

            assert(_.isArray(measurements), "Array is expected");

            options = options || {};
            if (!_.isUndefined(options.max_batch)) {
                assert(_.isNumber(options.max_batch),  "options.max_batch is expected to be a number");
            }
            precision.assert(options.precision, true, "options.precision is expected to be null or one of %values%");
            options = _.extend({}, this.options, _.pick(options, "precision", "max_batch"));

            // split measurements to `max_batch` limited parts
            return Promise.all(
                _
                    .chunks(measurements, options.max_batch)
                    .map(function(measurements) {
                        return Promise
                            .all(measurements.map(function(measurement) {
                                return self.serializer.serialize(measurement);
                            }))
                            .then(function(lines) {
                                return self._writeData(lines.join("\n"), options);
                            })
                    })
            );
        },

        _writeData: function(data, options) {
            var self = this;

            return this
                .getHost()
                .then(function(host) {
                    var queryObj = {};

                    if (_.isString(options.precision)) {
                        queryObj["precision"] = options.precision;
                    }

                    return self.http
                        .request(host.toString() + "/write", {
                            method: "POST",
                            auth: {
                                username: options.username,
                                password: options.password
                            },
                            query: _.extend(queryObj, {
                                db: options.database
                            }),
                            data: data
                        })
                        .then(function(resp) {
                            return new Promise(function(resolve, reject) {
                                if (resp.statusCode == 204) {
                                    return resolve();
                                }

                                switch (resp.statusCode) {
                                    case 200: {
                                        return reject(new Error("InfluxDB could not complete request: " + resp.body.toString()))
                                    }

                                    case 400: {
                                        return reject(new Error("InfluxDB invalid syntax"));
                                    }

                                    default: {
                                        return reject(new Error("InfluxDB unknown status code: " + resp.statusCode));
                                    }
                                }
                            });
                        });
                });
        }
    },

    {
        DEFAULTS: _.extend({}, Client.DEFAULTS, {
            max_batch:             5000,
            health_check_duration: 1000 * 60 * 60 * 4 // every 4 hour
        })
    }
);

exports.HttpClient = HttpClient;