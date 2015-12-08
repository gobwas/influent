var NetClient = require("./net").NetClient;
var Info = require("./info").Info;
var Batch = require("../batch").Batch;
var Query = require("../query").Query;
var assert = require("assert");
var Http = require("hurl/lib/http").Http;
var _ = require("../utils");
var precision = require("../precision");
var HttpClient;

/**
 * @class HttpClient
 * @extends NetClient
 */
HttpClient = NetClient.extend(
    /**
     * @lends HttpClient.prototype
     */
    {
        /**
         *
         */
        constructor: function(options) {
            NetClient.prototype.constructor.apply(this, arguments);

            // required options assertions
            assert(_.isObject(options),          "options is expected to be an Object");
            assert(_.isString(options.username), "options.username is expected to be a string");
            assert(_.isString(options.password), "options.password is expected to be a string");
        },

        injectHttp: function(http) {
            assert(http instanceof Http, "Http is expected");
            this.http = http;
        },

        ping: function() {
            var self = this;

            return this.elector.getHost()
                .then(function(host) {
                    return self._ping(host)
                        .then(function(info) {
                            // todo maybe omit these? and return just host?
                            return {
                                info: info,
                                host: host
                            };
                        });
                });
        },

        query: function(query) {
            var self = this;

            assert(query instanceof Query, "Query is expected");

            return this.elector.getHost()
                .then(function(host) {
                    return self.http
                        .request(host.toString() + "/query", {
                            method: "GET",
                            auth: {
                                username: self.options.username,
                                password: self.options.password
                            },
                            query: _.extend({
                                q:  query.command()
                            }, mapOptions(query.options()))
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

        write: function(batch) {
            var self = this;

            assert(batch instanceof Batch, "Batch is expected");

            return Promise
                .all(batch.measurements().map(function(measurement) {
                    return self.serializer.serialize(measurement);
                }))
                .then(function(lines) {
                    return self._writeData(lines.join("\n"), mapOptions(batch.options()));
                });
        },

        _ping: function(host) {
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

            return this.elector.getHost()
                .then(function(host) {
                    return self.http
                        .request(host.toString() + "/write", {
                            method: "POST",
                            auth: {
                                username: self.options.username,
                                password: self.options.password
                            },
                            query: options,
                            data:  data
                        })
                        .then(function(resp) {
                            return new Promise(function(resolve, reject) {
                                if (resp.statusCode == 204) {
                                    return resolve();
                                }

                                switch (resp.statusCode) {
                                    case 200: {
                                        return reject(new Error("InfluxDB could not complete request: " + resp.body.toString()));
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
        DEFAULTS: _.extend({}, NetClient.DEFAULTS, {
            username: null,
            password: null
        })
    }
);

var map = {
    "database": "db"
};
function mapOptions(options) {
    return Object.keys(options).reduce(function(result, key) {
        var mapped = map[key];
        var value = options[key];

        if (mapped) {
            result[mapped] = value;
        } else {
            result[key] = options[key];
        }

        return result;
    }, {});
}

exports.HttpClient = HttpClient;
