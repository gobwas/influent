var Client = require("./client").Client;
var Info = require("./info").Info;
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
            this.activeHost = null;
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
                findHost;

            if (!this.activeHost || (this.lastHealthCheck + this.options.health_check_duration) <= Date.now()) {
                findHost = _
                    .any(this.hosts.map(function(host) {
                        return self
                            ._pingHost(host)
                            .then(function() {
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

        ping: function() {
            var self = this;

            return _.any(this.hosts.map(function(host) {
                return self
                    ._pingHost(host)
                    .then(function(info) {
                        return {
                            info: info,
                            host: host
                        };
                    });
            }));
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
                            switch (resp.statusCode) {
                                case 200: {
                                    return JSON.parse(resp.body);
                                }

                                case 401: {
                                    return Promise.reject(new Error("InfluxDB unauthorized user"));
                                }

                                default: {
                                    return Promise.reject(new Error("InfluxDB unsuccessful status code: " + resp.statusCode));
                                }
                            }
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

        _pingHost: function(host) {
            return this.http
                .request(host.toString() + "/ping", {
                    method: "HEAD"
                })
                .then(function(resp) {
                    var info, version, date;

                    if (resp.statusCode != 204) {
                        return Promise.reject(new Error("Ping error: " + resp.statusCode + ": " + resp.body));
                    }

                    info = new Info();

                    // try to retreive version
                    version = resp.headers["x-influxdb-version"];
                    if (version) {
                        info.setVersion(version);
                    }

                    // try to retrieve server date
                    date = resp.headers["date"];
                    if (date) {
                        info.setDate(new Date(date));    
                    }
                    
                    return info;
                });
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

                                    case 401: {
                                        return reject(new Error("InfluxDB unauthorized user"));
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
            health_check_duration: 1000 * 60 * 30 // every 30 minutes
        })
    }
);

exports.HttpClient = HttpClient;