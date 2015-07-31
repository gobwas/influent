var Client = require("../client").Client;
var Serializer = require("../serializer").Serializer;
var Measurement = require("../measurement").Measurement;
var Host = require("../host").Host;
var assert = require("assert");
var Http = require("hurl/lib/http").Http;
var _ = require("../utils");
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
        constructor: function() {
            Client.prototype.constructor.apply(this, arguments);
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

        query: function(query) {
            var self = this;
            var options = this.options;

            assert(_.isString(query), "String is expected");

            return this
                .getHost()
                .then(function(host) {
                    return self.http
                        .request(host.toString() + "/query", {
                            method: "GET",
                            auth: {
                                username: options.username,
                                password: options.password
                            },
                            query: {
                                db: options.database,
                                q:  query
                            }
                        })
                        .then(function(resp) {
                            if (resp.statusCode == 200) {
                                return JSON.parse(resp.body);
                            }

                            throw new Error("InfluxDB unsuccessful status code");
                        });
                });
        },

        writeOne: function(measurement) {
            assert(measurement instanceof Measurement, "Measurement is expected");
            return this.writeMany([ measurement ]);
        },

        writeMany: function(measurements) {
            var self = this,
                chunk, parts, i, pos, size;

            assert(_.isArray(measurements), "Array is expected");

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
                        return self._write(list.join("\n"));
                    });
            }));
        },

        _write: function(data) {
            var self = this;
            var options = this.options;

            return this
                .getHost()
                .then(function(host) {
                    return self.http
                        .request(host.toString() + "/write", {
                            method: "POST",
                            auth: {
                                username: options.username,
                                password: options.password
                            },
                            query: {
                                db: options.database
                            },
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
        DEFAULTS: {
            username : '',
            password : '',
            database : '',
            max_batch: 5000
        }
    }
);

exports.HttpClient = HttpClient;