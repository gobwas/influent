var Client = require("../client").Client;
var Serializer = require("../serializer").Serializer;
var Measurement = require("../measurement").Measurement;
var Host = require("../host").Host;
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

            assert(_.isObject(options),          "options is expected to be an Object");
            assert(_.isString(options.username), "options.username is expected to be a string");
            assert(_.isString(options.password), "options.password is expected to be a string");
            assert(_.isString(options.database), "options.database is expected to be a string");

            precision.assert(options.precision, true, "options.precision is expected to be null or one of %values%");
            precision.assert(options.epoch, true, "options.epoch is expected to be null or one of %values%");

            this.hosts = [];
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
            var self = this;

            return new Promise(function(resolve, reject) {
                if (self.hosts.length == 0) {
                    return reject(new Error("Could not get host"));
                }

                resolve(self.hosts[0]);
            });
        },

        query: function(query, options) {
            var self = this;

            assert(_.isString(query), "String is expected");

            options = options || {};
            precision.assert(options.epoch, true, "options.epoch is expected to be null or one of %values%");
            options = _.extend({}, this.options, _.pick(options, "epoch"));

            return this
                .getHost()
                .then(function(host) {
                    var queryObj;

                    queryObj = {};

                    if (_.isString(options.epoch)) {
                        queryObj["epoch"] = options.epoch;
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
            var self = this,
                chunk, parts, i, pos, size;

            assert(_.isArray(measurements), "Array is expected");

            options = options || {};
            precision.assert(options.precision, true, "options.precision is expected to be null or one of %values%");
            options = _.extend({}, this.options, _.pick(options, "precision"));

            i = 0;
            size = this.options.max_batch;

            parts = [];

            while (true) {
                pos = i * size;
                chunk = measurements.slice(pos, pos + size);

                if (chunk.length == 0) {
                    break;
                }

                parts.push(chunk);
                i++;
            }

            return Promise.all(parts.map(function(measurements) {
                return Promise
                    .all(measurements.map(function(measurement) {
                        return self.serializer.serialize(measurement);
                    }))
                    .then(function(list) {
                        return self._write(list.join("\n"), options);
                    });
            }));
        },

        _write: function(data, options) {
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
            max_batch: 5000
        })
    }
);

exports.HttpClient = HttpClient;