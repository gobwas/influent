"use strict";
;(function(root, factory) {
if (typeof define === 'function' && define.amd) {
define([], factory);
} else if (typeof exports === 'object') {
module.exports = factory();
} else {
root.influent = factory();
}
}(this, function() {
var require;
require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");
var Measurement = require("./measurement").Measurement;
var precision = require("./precision");
var consistency = require("./consistency");
var Batch;

/**
 * @class Batch
 * @constructor
 */
Batch = function(attrs) {
    if (!_.isUndefined(attrs)) {
        assert(_.isObject(attrs), "Object is expected");

        var db = attrs.database;
        if (!_.isUndefined(db)) {
            assert(_.isString(db), "String is expected");
            this.database = db;
        }

        var rp = attrs.rp;
        if (!_.isUndefined(rp)) {
            assert(_.isString(rp), "String is expected");
            this.rp = rp;
        }

        var p = attrs.precision;
        if (!_.isUndefined(p)) {
            assert(_.isString(p), "String is expected");
            assert(precision.isValid(p), "precision is expected to be one of " + precision.VALUES);
            this.precision = p;
        }

        var c = attrs.consistency;
        if (!_.isUndefined(c)) {
            assert(_.isString(c), "String is expected");
            assert(consistency.isValid(c), "consistency is expected to be one of " + consistency.VALUES);
            this.consistency = c;
        }
    }

    this.list = [];
};

Batch.prototype = {
    constructor: Batch,

    add: function(measurement) {
        assert(measurement instanceof Measurement, "Measurement is expected");
        this.list.push(measurement);
    },

    measurements: function() {
        return this.list;
    },

    options: function() {
        var self = this;

        return [
            "database",
            "precision",
            "rp",
            "consistency"
        ].reduce(function(result, attr) {
            var value = self[attr];
            if (!_.isUndefined(value)) {
                result[attr] = value;
            }

            return result;
        }, {});
    }
};

Batch.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Batch = Batch;

},{"./consistency":14,"./measurement":15,"./precision":16,"./utils":21,"assert":"assert","inherits-js":34}],2:[function(require,module,exports){
var inherits = require("inherits-js");
var _ = require("../utils");
var assert = require("assert");

/**
 * @abstract
 */
function Client(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}

Client.prototype = {
    constructor: Client,

    /**
     * @abstract
     */
    ping: function() {
        throw new TypeError("Method 'query' must be implemented");
    },

    /**
     * @abstract
     */
    query: function(query) {
        throw new TypeError("Method 'query' must be implemented");
    },

    /**
     * @abstract
     */
    write: function(measurements) {
        throw new TypeError("Method 'writeOne' must be implemented");
    },
};

Client.DEFAULTS = {};

Client.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Client = Client;

},{"../utils":21,"assert":"assert","inherits-js":34}],3:[function(require,module,exports){
var Client = require("./client").Client;
var assert = require("assert");
var Measurement = require("../measurement").Measurement;
var Type = require("../type").Type;
var cast = require("../type").cast;
var precision = require("../precision");
var consistency = require("../consistency");
var Query = require("../query").Query;
var Batch = require("../batch").Batch;
var _ = require("../utils");
var DecoratorClient;

function addField(measurement, field, value) {
    if (value instanceof Type) {
        measurement.addField(field, value);
    } else {
        measurement.addField(field, cast(value));
    }
}

function tryCastMeasurement(def) {
    var key, measurement, value, fields, tags, timestamp;

    if (def instanceof Measurement) {
        return def;
    }

    assert(_.isObject(def), "Object is expected");
    assert(_.isString(key = def.key), "Key is expected to be a string");

    measurement = new Measurement(key);

    value = def.value;
    if (!_.isUndefined(value)) {
        addField(measurement, "value", value);
    }

    fields = def.fields;
    if (!_.isUndefined(fields)) {
        assert(_.isObject(fields), "Fields is expected to be an object");

        _.forEachIn(fields, function(value, field) {
            addField(measurement, field, value);
        });
    }

    assert(Object.keys(measurement.fields).length > 0, "Measurement should have at least one field");

    tags = def.tags;
    if (!_.isUndefined(tags)) {
        assert(_.isObject(tags), "Tags is expected to be an object");

        _.forEachIn(tags, function(value, tag) {
            measurement.addTag(tag, value);
        });
    }

    timestamp = def.timestamp;
    if (!_.isUndefined(timestamp)) {
        if (_.isString(timestamp)) {
            measurement.setTimestamp(timestamp);
        } else if (_.isNumber(timestamp)) {
            measurement.setTimestamp(timestamp.toString());
        } else if (timestamp instanceof Date) {
            measurement.setTimestamp(timestamp.getTime().toString());
        } else {
            throw Error("String, Number, or Date is expected");
        }
    }

    return measurement;
}

/**
 * @class DecoratorClient
 * @constructor
 */
DecoratorClient = function(options) {
    if (_.isObject(options)) {
        // common
        if (!_.isUndefined(options.database)) {
            assert(_.isString(options.database), "options.database is expected to be a string");
        }

        // write
        if (!_.isUndefined(options.max_batch)) {
            assert(_.isNumber(options.max_batch), "options.max_batch is expected to be a number");
        }

        if (!_.isUndefined(options.rp)) {
            assert(_.isString(options.rp), "options.rp is expected to be a string");
        }

        if (!_.isUndefined(options.precision)) {
            assert(_.isString(options.precision), "options.precision is expected to be a string");
            assert(precision.isValid(options.precision), "options.precision is expected to be one of " + precision.VALUES);
        }

        if (!_.isUndefined(options.consistency)) {
            assert(_.isString(options.consistency), "options.consistency is expected to be a string");
            assert(consistency.isValid(options.consistency), "options.consistency is expected to be one of " + consistency.VALUES);
        }

        // query
        if (!_.isUndefined(options.chunk_size)) {
            assert(_.isNumber(options.chunk_size), "options.chunk_size is expected to be a number");
        }

        if (!_.isUndefined(options.epoch)) {
            assert(_.isString(options.epoch), "options.epoch is expected to be a string");
            assert(precision.isValid(options.epoch), "options.epoch is expected to be one of " + precision.VALUES);
        }
    }

    this.options = _.extend({}, this.constructor.DEFAULTS, options || {});
};

DecoratorClient.prototype = {
    constructor: DecoratorClient,

    injectClient: function(client) {
        assert(client instanceof Client, "Client is expected");
        this.client = client;
    },

    ping: function() {
        return this.client.ping();
    },

    query: function(command, options) {
        var query;

        if (command instanceof Query) {
            query = command;
        } else {
            query = new Query(
                command,
                _.extend(
                    _.pick(this.options, ["database", "epoch", "chunk_size"]),
                    options
                )
            );
        }

        return this.client.query(query);
    },

    write: function(m, options) {
        var self = this;
        var batches, config, max_batch;

        if (m instanceof Batch) {
            batches = [m];
        } else {
            assert(_.isArray(m) || _.isObject(m), "Array or Object is expected");

            config = _.extend(
                _.pick(this.options, ["database", "precision", "rp", "consistency"]),
                options || {}
            );

            if (_.isObject(options) && !_.isUndefined(options.max_batch)) {
                assert(_.isNumber(options.max_batch), "options.max_batch should be a number");
                max_batch = options.max_batch;
            } else {
                max_batch = this.options.max_batch;
            }

            batches = _.chunks((_.isObject(m) ? [m] : m).map(tryCastMeasurement), max_batch)
                .map(function(chunk) {
                    var batch = new Batch(config);

                    chunk.forEach(batch.add.bind(batch));

                    return batch;
                });
        }

        return Promise.all(batches.map(function(batch) {
            return self.client.write(batch);
        }));
    }
};

DecoratorClient.extend = function(prots, statics) {
    return inherits(this, prots, statics);
};

DecoratorClient.DEFAULTS = {
    max_batch: 5000
};

DecoratorClient.OPTIONS = [
    "max_batch",
    "database",
    "rp",
    "precision",
    "consistency",
    "chunk_size",
    "epoch"
];

exports.DecoratorClient = DecoratorClient;

},{"../batch":1,"../consistency":14,"../measurement":15,"../precision":16,"../query":17,"../type":20,"../utils":21,"./client":2,"assert":"assert"}],4:[function(require,module,exports){
var Elector = require("./elector").Elector;
var Ping = require("./ping/ping").Ping;
var _ = require("../../utils");
var assert = require("assert");
var BaseElector;

/**
 * @class BaseElector
 * @extends Elector
 */
BaseElector = Elector.extend(
    /**
     * @lends BaseElector.prototype
     */
    {
        constructor: function() {
            Elector.prototype.constructor.apply(this, arguments);
            this.isPending = false;
            this.pending = Promise.resolve();
        },

        injectPing: function(ping) {
            assert(ping instanceof Ping, "Ping is expected");
            this.ping = ping;
        },

        getHost: function() {
            var self = this;

            if (this.hosts.length == 1) {
                return Promise.resolve(this.hosts[0]);
            }

            // prevent long queue
            if (this.isPending) {
                return this.pending;
            }

            if (!this.activeHost || (this.lastHealthCheck + this.options.period) <= Date.now()) {
                this.isPending = true;

                this.pending = _.any(this.hosts.map(function(host) {
                    return self.ping.pong(host)
                        .then(function() {
                            return host;
                        });
                }));

                return this.pending
                    .then(function(host) {
                        self.lastHealthCheck = Date.now();
                        self.activeHost = host;
                        self.isPending = false;

                        return host;
                    });
            }

            return Promise.resolve(this.activeHost);
        }
    },

    {
        DEFAULTS: _.extend({}, Elector.DEFAULTS, {
            period: 30 * 60 * 1000 // 30 minutes
        })
    }
);

exports.BaseElector = BaseElector;

},{"../../utils":21,"./elector":5,"./ping/ping":7,"assert":"assert"}],5:[function(require,module,exports){
var inherits = require("inherits-js");
var _ = require("../../utils");
var Host = require("../host").Host;
var assert = require("assert");

/**
 * @abstract
 */
function Elector(hosts, options) {
    assert(_.isArray(hosts), "Array is expected");
    assert(hosts.length > 0, "Hosts should be not empty");
    hosts.forEach(function(host) {
        assert(host instanceof Host, "Host is expected");
    });

    this.hosts = hosts;

    this.options = _.extend({}, this.constructor.DEFAULTS, options);
    this.lastHealthCheck = -1;
    this.activeHost = null;
}

Elector.prototype = {
    constructor: Elector,

    /**
     * @abstract
     */
    getHost: function(hosts) {
        throw new TypeError("Method 'getHost' should be implemented");
    }
};

Elector.DEFAULTS = {
    period: 0
};

Elector.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Elector = Elector;

},{"../../utils":21,"../host":10,"assert":"assert","inherits-js":34}],6:[function(require,module,exports){
var Ping = require("./ping").Ping;
var Host = require("../../host").Host;
var _ = require("../../../utils");
var Http = require("hurl/lib/http").Http;
var assert = require("assert");
var HttpPing;

/**
 * @class HttpPing
 * @extends Ping
 */
HttpPing = Ping.extend(
    /**
     * @lends HttpPing.prototype
     */
    {
        injectHttp: function(http) {
            assert(http instanceof Http, "Http is expected");
            this.http = http;
        },

        pong: function(host) {
            var config;

            assert(host instanceof Host, "Host is expected");

            // prepare config for the request
            config = _.pick(this.options, ["timeout"]);

            return this.http.request(host.toString(), config)
                .then(function() {
                    return;
                });
        }
    },

    {
        DEFAULTS: _.extend({}, Ping.DEFAULTS, {
            timeout: 5000
        })
    }
);

exports.HttpPing = HttpPing;

},{"../../../utils":21,"../../host":10,"./ping":7,"assert":"assert","hurl/lib/http":28}],7:[function(require,module,exports){
var inherits = require("inherits-js");
var _ = require("../../../utils");
var assert = require("assert");

/**
 * @class Ping
 * @abstract
 */
function Ping(options) {
    this.options = _.extend({}, this.constructor.DEFAULTS, options);
}

/**
 * @abstract
 * @returns Promise
 */
Ping.prototype.pong = function(host) {
    throw new TypeError("Method 'pong' should be implemented");
};

Ping.extend = function(p, s) {
    return inherits(this, p, s);
};

Ping.DEFAULTS = {};

exports.Ping = Ping;

},{"../../../utils":21,"assert":"assert","inherits-js":34}],8:[function(require,module,exports){
var Elector = require("./elector").Elector;

/**
 * @class RoundRobinElector
 * @extends Elector
 */
var RoundRobinElector = Elector.extend(
    /**
     * @lends RoundRobinElector.prototype
     */
    {
        constructor: function() {
            Elector.prototype.constructor.apply(this, arguments);
            this.index = 0;
        },

        getHost: function(hosts) {
            var host = this.hosts[this.index];
            this.index = (this.index + 1) % this.hosts.length;

            return Promise.resolve(host);
        }
    }
);

exports.RoundRobinElector = RoundRobinElector;

},{"./elector":5}],9:[function(require,module,exports){
var Elector = require("./elector").Elector;

/**
 * @class StubElector
 * @extends Elector
 */
var StubElector = Elector.extend(
    /**
     * @lends StubElector.prototype
     */
    {
        getHost: function(hosts) {
            return Promise.resolve(this.hosts[0]);
        }
    }
);

exports.StubElector = StubElector;

},{"./elector":5}],10:[function(require,module,exports){
var assert = require("assert");
var _ = require("./../utils");

/**
 * @class Host
 * @constructor
 * @final
 */
function Host(protocol, host, port) {
    assert(_.isString(protocol), "String is expected for protocol");
    assert(_.isString(host), "String is expected for host");
    assert(_.isNumber(port), "Number is expected for port");

    this.protocol = protocol;
    this.host = host;
    this.port = port;
}

Host.prototype = {
    constructor: Host,

    toString: function() {
        return this.protocol + "://" + this.host + ":" + this.port;
    }
};

exports.Host = Host;

},{"./../utils":21,"assert":"assert"}],11:[function(require,module,exports){
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
                                    return Promise.reject(new Error("InfluxDB unauthorized user: " + tryGetError(resp)));
                                }

                                default: {
                                    return Promise.reject(new Error("InfluxDB unknown status code: " + resp.statusCode + ": " + resp.body.toString()));
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
                                        return reject(new Error("InfluxDB could not complete request: " + tryGetError(resp)));
                                    }

                                    case 401: {
                                        return reject(new Error("InfluxDB unauthorized user: " + tryGetError(resp)));
                                    }

                                    case 400: {
                                        return reject(new Error("InfluxDB invalid syntax: " + tryGetError(resp)));
                                    }

                                    case 500: {
                                        return reject(new Error("InfluxDB is overloaded or significantly impaired: " + tryGetError(resp)));
                                    }

                                    default: {
                                        return reject(new Error("InfluxDB unknown status code: " + resp.statusCode + ": " + resp.body.toString()));
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

function tryGetError(resp) {
    var body = resp.body.toString();
    var obj;

    try {
        obj = JSON.parse(body);
        if (Object.keys(obj).length == 1 && _.isString(obj.error)) {
            return obj.error;
        }
    } catch (err) {
        //
    }

    return body;
}

var map = {
    database: "db"
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

},{"../batch":1,"../precision":16,"../query":17,"../utils":21,"./info":12,"./net":13,"assert":"assert","hurl/lib/http":28}],12:[function(require,module,exports){
var assert = require("assert");
var _ = require("../utils");

function Info() {
    this.version = null;
    this.date = null;
}

Info.prototype.setVersion = function(version) {
    assert(_.isString(version), "String is expected");
    this.version = version;
};

Info.prototype.setDate = function(date) {
    assert(date instanceof Date, "Date is expected");
    this.date = date;
};

exports.Info = Info;

},{"../utils":21,"assert":"assert"}],13:[function(require,module,exports){
var Client = require("./client").Client;
var Host = require("./host").Host;
var Elector = require("./elector/elector").Elector;
var Serializer = require("../serializer/serializer").Serializer;
var _ = require("../utils");
var assert = require("assert");
var NetClient;

/**
 * @class NetClient
 * @extends Client
 */
NetClient = Client.extend(
    /**
     * @lends NetClient.prototype
     */
    {
        constructor: function() {
            Client.prototype.constructor.apply(this, arguments);
            this.hosts = [];
        },

        injectSerializer: function(serializer) {
            assert(serializer instanceof Serializer, "Serializer is expected");
            this.serializer = serializer;
        },

        injectElector: function(elector) {
            assert(elector instanceof Elector, "Elector is expected");
            this.elector = elector;
        }
    }
);

exports.NetClient = NetClient;

},{"../serializer/serializer":19,"../utils":21,"./client":2,"./elector/elector":5,"./host":10,"assert":"assert"}],14:[function(require,module,exports){
var assert = require("assert");
var _ = require("./utils");

var ONE    = "one";
var QUORUM = "quorum";
var ALL    = "all";
var ANY    = "any";

var VALUES = [
    ONE,
    QUORUM,
    ALL,
    ANY
];

exports.ONE    = ONE;
exports.QUORUM = QUORUM;
exports.ALL    = ALL;
exports.ANY    = ANY;

exports.VALUES = VALUES;

exports.isValid = function(consistency) {
    return VALUES.indexOf(consistency) != -1;
};

},{"./utils":21,"assert":"assert"}],15:[function(require,module,exports){
var Type   = require("./type").Type;
var assert = require("assert");
var _      = require("./utils");

/**
 * @class Measurement
 * @constructor
 * @final
 *
 * @param {string} key
 */
function Measurement(key) {
    assert(_.isString(key), "String is expected");

    this.key = key;

    this.tags = {};
    this.fields = {};
    this.timestamp = null;
}

Measurement.prototype = {
    constructor: Measurement,

    addTag: function(key, value) {
        assert(_.isString(key), "String is expected");
        assert(_.isString(value), "String is expected");
        assert(this.tags.hasOwnProperty(key) == false, "Tag with key '" + key + "' is already set");

        this.tags[key] = value;

        return this;
    },

    addField: function(key, value) {
        assert(_.isString(key));
        assert(value instanceof Type, "Type is expected");
        assert(this.fields.hasOwnProperty(key) == false, "Field with key '" + key + "' is already set");

        this.fields[key] = value;

        return this;
    },

    setTimestamp: function(timestamp) {
        assert(_.isNumericString(timestamp), "Numeric string is expected :" + timestamp);
        this.timestamp = timestamp;

        return this;
    }
};

exports.Measurement = Measurement;

},{"./type":20,"./utils":21,"assert":"assert"}],16:[function(require,module,exports){
var assert = require("assert");
var _ = require("./utils");

var NANOSECONDS  = "n";
var MICROSECONDS = "u";
var MILLISECONDS = "ms";
var SECONDS      = "s";
var MINUTES      = "m";
var HOURS        = "h";

var VALUES = [
    NANOSECONDS,
    MICROSECONDS,
    MILLISECONDS,
    SECONDS,
    MINUTES,
    HOURS
];

exports.NANOSECONDS = NANOSECONDS;
exports.MICROSECONDS = MICROSECONDS;
exports.MILLISECONDS = MILLISECONDS;
exports.SECONDS = SECONDS;
exports.MINUTES = MINUTES;
exports.HOURS = HOURS;

exports.VALUES = VALUES;

exports.isValid = function(precision) {
    return VALUES.indexOf(precision) != -1;
};

},{"./utils":21,"assert":"assert"}],17:[function(require,module,exports){
var inherits = require("inherits-js");
var _ = require("./utils");
var assert = require("assert");
var Measurement = require("./measurement");
var precision = require("./precision");
var consistency = require("./consistency");
var Query;

/**
 * @class Query
 * @constructor
 */
Query = function(command, attrs) {
    assert(_.isString(command), "String is expected");
    this.cmd = command;

    assert(_.isObject(attrs), "Object is expected");

    var db = attrs.database;
    if (!_.isUndefined(db)) {
        assert(_.isString(db), "String is expected");
        this.database = db;
    }

    var e = attrs.epoch;
    if (!_.isUndefined(e)) {
        assert(_.isString(e), "String is expected");
        assert(precision.isValid(e), "epoch is expected to be one of " + precision.VALUES);
        this.epoch = e;
    }

    var s = attrs.chunk_size;
    if (!_.isUndefined(s)) {
        assert(_.isNumber(s), "Number is expected");
        this.chunk_size = s;
    }
};

Query.prototype = {
    constructor: Query,

    command: function() {
        return this.cmd;
    },

    options: function() {
        var self = this;

        return [
            "database",
            "epoch",
            "chunk_size"
        ].reduce(function(result, attr) {
            var value = self[attr];
            if (!_.isUndefined(value)) {
                result[attr] = value;
            }

            return result;
        }, {});
    }
};

Query.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Query = Query;

},{"./consistency":14,"./measurement":15,"./precision":16,"./utils":21,"assert":"assert","inherits-js":34}],18:[function(require,module,exports){
var Serializer  = require("./serializer").Serializer;
var Measurement = require("../measurement").Measurement;
var Str         = require("../type").Str;
var Bool        = require("../type").Bool;
var I64         = require("../type").I64;
var F64         = require("../type").F64;
var assert      = require("assert");
var _           = require("../utils");

var LineSerializer, escape, asString, asBoolean, asFloat, asInteger;

escape = (function() {
    var spaceReg = / /g;
    var commaReg = /,/g;

    return function(str) {
        assert(_.isString(str), "String is expected");

        return str
            .replace(spaceReg, "\\ ")
            .replace(commaReg, "\\,");
    };
})();

asString = (function() {
    var quotesReg = /"/g;

    return function(str) {
        var result;

        assert(_.isString(str), "String is expected");

        result = str.replace(quotesReg, "\\\"");

        return "\"" + result + "\"";
    };
})();

asBoolean = function(obj) {
    assert(_.isBoolean(obj), "Boolean is expected");

    return obj ? "t" : "f";
};

asInteger = function(obj) {
    var str;

    assert(_.isNumber(obj), "Number is expected");

    str = obj.toString();

    assert((str.indexOf(".") == -1), "Converting to integer, but float given");

    return str + "i";
};

asFloat = function(obj) {
    assert(_.isNumber(obj), "Number is expected");

    return obj.toString();
};

function sortAndEach(obj, iterator) {
    // as spec says, sort should be compatible with Go's func Compare
    // Compare returns an integer comparing two byte slices lexicographically.
    // The result will be 0 if a==b, -1 if a < b, and +1 if a > b. A nil argument is equivalent to an empty slice.
    // @see http://golang.org/pkg/bytes/#Compare
    Object
        .keys(obj)
        .sort(function(a, b) {
            if (a < b) {
                return -1;
            }

            if (a > b) {
                return 1;
            }

            return 0;
        })
        .forEach(function(prop) {
            iterator.call(null, obj[prop], prop, obj);
        });
}

/**
 * @class LineSerializer
 * @extends Serializer
 */
LineSerializer = Serializer.extend(
    /**
     * @lends LineSerializer.prototype
     */
    {
        serialize: function(measurement) {
            assert(measurement instanceof Measurement, "Measurement is expected");

            return new Promise(function(resolve) {
                var line, timestamp;

                line = escape(measurement.key);

                sortAndEach(measurement.tags, function(value, tag) {
                    line += "," + escape(tag) + "=" + escape(value);
                });

                sortAndEach(measurement.fields, (function() {
                    var touchedFields, glue;

                    return function(value, field) {
                        var strValue;

                        if (!touchedFields) {
                            glue = " ";
                            touchedFields = true;
                        } else {
                            glue = ",";
                        }

                        switch (true) {
                            case value instanceof Str: {
                                strValue = asString(value.data);
                                break;
                            }

                            case value instanceof Bool: {
                                strValue = asBoolean(value.data);
                                break;
                            }

                            case value instanceof I64: {
                                strValue = asInteger(value.data);
                                break;
                            }

                            case value instanceof F64: {
                                strValue = asFloat(value.data);
                                break;
                            }

                            default: {
                                return Promise.reject(new TypeError("Unable to determine action for value type"));
                            }
                        }

                        line += glue + escape(field) + "=" + strValue;
                    };
                })());

                if (timestamp = measurement.timestamp) {
                    line += " " + timestamp;
                }

                resolve(line);
            });
        }
    }
);

exports.LineSerializer = LineSerializer;

},{"../measurement":15,"../type":20,"../utils":21,"./serializer":19,"assert":"assert"}],19:[function(require,module,exports){
var inherits = require("inherits-js");

/**
 * @abstract
 */
function Serializer() {
    //
}

Serializer.prototype = {
    constructor: Serializer,

    /**
     * @abstract
     */
    serialize: function(measurement) {
        throw new TypeError("Method 'serialize' must be implemented");
    }
};

Serializer.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Serializer = Serializer;

},{"inherits-js":34}],20:[function(require,module,exports){
var _ = require("./utils");
var assert = require("assert");
var inherits = require("inherits-js");

/**
 * @class Value
 * @constructor
 * @abstract
 *
 * @param {string|number|boolean} data
 */
function Type(data) {
    if (!(this instanceof Type)) {
        throw new TypeError("Could not use type constructor without 'new' keyword");
    }

    this.data = data;
}

Type.extend = function(p, s) {
    return inherits(this, p, s);
};

/**
 * @class Str
 * @extends Type
 */
var Str = Type.extend({
    constructor: function(s) {
        assert(_.isString(s), "String is expected");
        Type.prototype.constructor.call(this, s);
    }
});

/**
 * @class F64
 * @extends Type
 */
var F64 = Type.extend({
    constructor: function(f) {
        assert(_.isNumber(f), "Number is expected");
        Type.prototype.constructor.call(this, f);
    }
});

/**
 * @class I64
 * @extends Type
 */
var I64 = Type.extend({
    constructor: function(i) {
        assert(_.isNumber(i), "Number is expected");
        Type.prototype.constructor.call(this, i);
    }
});

/**
 * @class Bool
 * @extends Type
 */
var Bool = Type.extend({
    constructor: function(b) {
        assert(_.isBoolean(b), "Boolean is expected");
        Type.prototype.constructor.call(this, b);
    }
});

function cast(obj) {
    var type = _.getTypeOf(obj);

    switch (type) {
        case "String": {
            return new Str(obj);
        }

        case "Number": {
            return new F64(obj);
        }

        case "Boolean": {
            return new Bool(obj);
        }

        default: {
            throw new TypeError("Could not map to the influx type: got '" + type + "'");
        }
    }
}

exports.cast = cast;
exports.Type = Type;
exports.Str = Str;
exports.F64 = F64;
exports.I64 = I64;
exports.Bool = Bool;

},{"./utils":21,"assert":"assert","inherits-js":34}],21:[function(require,module,exports){
var assert = require("assert");

exports.noop = function() {};

exports.getTypeOf = (function() {
    var typeReg = /\[object ([A-Z][a-z]+)\]/;

    return function(obj) {
        return Object.prototype.toString.call(obj).replace(typeReg, "$1");
    };
})();

exports.forEachIn = function(obj, iterator) {
    if (obj == null || typeof obj != "object") {
        return;
    }

    Object.keys(obj).forEach(function(key) {
        iterator.call(null, obj[key], key, obj);
    });
};

exports.extend = function(target) {
    [].slice.call(arguments).forEach(function(obj) {
        exports.forEachIn(obj, function(value, prop) {
            target[prop] = value;
        });
    });

    return target;
};

exports.values = function(source) {
    var values = [];

    exports.forEachIn(source, function(value) {
        values.push(value);
    });

    return values;
};

exports.pick = function(source, keys) {
    var needles, result;

    if (exports.isArray(keys)) {
        needles = keys;
    } else {
        needles = Array.prototype.slice.call(arguments, 1);
    }

    result = {};
    exports.forEachIn(source, function(value, key) {
        if (needles.indexOf(key) != -1) {
            result[key] = value;
        }
    });

    return result;
};

exports.isMatch = function(obj, criteria) {
    var i, key, keys, len;

    keys = Object.keys(criteria);
    len = keys.length;

    for (i = 0; i < len; i++) {
        key = keys[i];
        if (obj[key] !== criteria[key]) {
            return false;
        }
    }

    return true;
};

exports.findWhere = function(collection, criteria) {
    var i, len, item, matcher;

    if (_.isFunction(criteria)) {
        matcher = criteria;
    } else {
        matcher = function(item) {
            return exports.isMatch(item, criteria);
        };
    }

    len = collection.length;
    for (i = 0; i < len; i++) {
        item = collection[i];
        if (matcher.call(null, item)) {
            return item;
        }
    }

    return null;
};

["Object", "String", "Number", "Boolean", "Array", "Undefined"].forEach(function(type) {
    exports["is" + type] = function(obj) {
        return exports.getTypeOf(obj) == type;
    };
});

exports.isNumericString = (function() {
    var reg = /^\d*$/;
    return function(obj) {
        return exports.isString(obj) && reg.test(obj);
    };
})();

exports.flatten = function(list) {
    return list.reduce(function(result, item) {
        return result.concat(exports.isArray(item) ? exports.flatten(item) : item);
    }, []);
};

exports.chunks = function(source, size) {
    var i, index, chunks, chunk;

    assert(exports.isArray(source), "Array is expected to be a source");
    assert(exports.isNumber(size), "Number is expected to be a size");
    assert(size > 0, "Size must be a positive number");

    i = 0;
    chunks = [];
    while (true) {
        index = i * size;
        chunk = source.slice(index, index + size);

        if (chunk.length == 0) {
            break;
        }

        chunks.push(chunk);
        i++;
    }

    return chunks;
};

exports.any = function(promises) {
    return new Promise(function(resolve, reject) {
        var fulfilled, rejected, total;

        total = promises.length;
        fulfilled = false;
        rejected = 0;

        promises.forEach(function(promise) {
            promise
                .then(function(value) {
                    if (!fulfilled) {
                        fulfilled = true;
                        resolve(value);
                    }
                })
                ['catch'](function(err) {
                    if (!fulfilled && ++rejected == total) {
                        reject(err);
                    }
                });
        });
    });
};


},{"assert":"assert"}],22:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],23:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],24:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":23,"_process":25,"inherits":22}],25:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],26:[function(require,module,exports){
var inherits = require("inherits-js");
var HttpError;

/**
 * @constructor
 * @extends Error
 */
HttpError = inherits(Error,
    /**
     * @lends HttpError.prototype
     */
    {
        constructor: function() {
            var error;

            error = Error.apply(null, arguments);

            // save native error
            this._error = error;

            this.message = error.message;
            this.stack   = error.stack
                ? error.stack.replace(new RegExp("^Error"), this.name)
                : null;
        }
    },

    {
        extend: function(p, s) {
            return inherits(this, p, s);
        }
    }
);

exports.HttpError = HttpError;

},{"inherits-js":34}],27:[function(require,module,exports){
var HttpError = require("../error").HttpError,
    TimeoutHttpError;

/**
 * TimeoutHttpError
 *
 * @class TimeoutHttpError
 * @extends HttpError
 */
TimeoutHttpError = HttpError.extend(
    /**
     * @lends TimeoutError.prototype
     */
    {

    }
);

exports.TimeoutHttpError = TimeoutHttpError;

},{"../error":26}],28:[function(require,module,exports){
var _            = require("./utils"),
    inherits     = require("inherits-js"),
    assert       = require("assert"),
    debug        = require("debug"),
    EventEmitter = require("events").EventEmitter,
    Http;

/**
 * Http
 *
 * @class Http
 * @extends EventEmitter
 * @abstract
 *
 * @param {Object} [options]
 */
Http = inherits( EventEmitter,
    /**
     * @lends Http.prototype
     */
    {
        constructor: function(options) {
            var self = this;

            EventEmitter.call(this);
            this.options = _.extend({}, this.constructor.DEFAULTS, options);

            // default logger is evented
            this.logger = [
                "debug",
                "info",
                "notice",
                "warning",
                "error",
                "critical",
                "alert",
                "emergency"
            ].reduce(
                function(memo, level) {
                    var logger;

                    logger = debug("hurl:" + level);

                    memo[level] = function() {
                        var args;

                        args = Array.prototype.slice.call(arguments);

                        logger.apply(null, args)
                        self.emit.apply(self, ["log:" + level].concat(args));
                    };

                    return memo;
                },
                {}
            );
        },

        injectUUID: function(uuid) {
            assert(_.isEmpty(this.uuid), "UUID is already set");
            assert(typeof uuid == "function", "UUID is expected to be a function");
            this.uuid = uuid;
        },

        genUUID: function(str) {
            assert(_.isUndefined(str) || _.isString(str), "String is expected");
            return this.uuid ? this.uuid.call(null, str) : _.uniqueId(str);
        },

        /**
         * @abstract
         *
         * @param {string} url
         * @param {Object} [options]
         * @param {Object} [options.query]
         * @param {Object} [options.headers]
         * @param {Object} [options.auth]
         * @param {Object} [options.agent]
         * @param {Object} [options.data]
         * @param {Object} [options.timeout]
         * @param {Object} [options.method]
         *
         * @returns Promise
         */
        request: function(url, options) {
            throw new Error("Method must be implemented");
        }
    },

    /**
     * @lends Http
     */
    {
        extend: function(prots, statics) {
            return inherits(this, prots, statics);
        },

        DEFAULTS: {}
    }
);

exports.Http = Http;

},{"./utils":29,"assert":"assert","debug":31,"events":"events","inherits-js":34}],29:[function(require,module,exports){
function typeOf(obj) {
    return Object.prototype.toString.call(obj).replace(/\[object ([A-Z][a-z]+)\]/, "$1");
}

["String", "Object", "Array", "Undefined"].forEach(function(type) {
    exports["is" + type] = function(obj) {
        return typeOf(obj) == type;
    };
});

function extend(target, sources, safe) {
    sources.forEach(function(source) {
        exports.forEach(source, function(value, key) {
            if (!safe || target[key] === void 0) {
                target[key] = value;
            }
        });
    });

    return target;
}

exports.defaults = function(target) {
    return extend(target, [].slice.call(arguments, 1), true);
};

exports.extend = function(target) {
    return extend(target, [].slice.call(arguments, 1), false);
};

exports.forEach = function(obj, iterator) {
    if (exports.isArray(obj)) {
        obj.forEach(iterator);

        return;
    }

    if (exports.isObject(obj)) {
        Object.keys(obj).forEach(function(key) {
            iterator.call(null, obj[key], key, obj);
        });

        return;
    }
};

exports.isEmpty = function(obj) {
    if (obj == null) return true;
    if (exports.isArray(obj) || exports.isString(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
};

exports.contains = function(list, value) {
    return list.indexOf(value) != -1;
};

var keys = {};
var counter = 0;
exports.uniqueId = function(key) {
    if (exports.isString(key)) {
        if (exports.isUndefined(keys[key])) {
            keys[key] = 0;
        }
        return ++keys[key];
    }

    return ++counter;
};

},{}],30:[function(require,module,exports){
var Http      = require("./http").Http,
    _         = require("./utils"),
    HttpError = require("./error").HttpError,
    querystring = require("querystring"),
    TimeoutError = require("./error/timeout").TimeoutHttpError,
    XhrHttp;

/**
 * XhrHttp
 *
 * @class XhrHttp
 * @extends Http
 */
XhrHttp = Http.extend(
    /**
     * @lends XhrHttp.prototype
     */
    {
        /**
         * @param {string} url
         * @param {Object} [options]
         * @param {Object} [options.query]
         * @param {Object} [options.headers]
         * @param {Object} [options.auth]
         * @param {Object} [options.agent]
         * @param {Object} [options.data]
         * @param {Object} [options.timeout]
         * @param {Object} [options.method]
         */
        request: function(url, options) {
            var self = this,
                start, commonLog;

            commonLog = {
                href: url,
                uuid: this.genUUID("req.out")
            };

            options = _.defaults(options || {}, {
                method: "GET"
            });

            start = this.getTime();

            return new Promise(function(resolve, reject) {
                var method, query, data, auth, timeout,
                    config, headers, error, xhr;

                method = options.method;
                data = options.data;

                // @see http://www.w3.org/TR/XMLHttpRequest/ #4.6.6
                if (_.contains(["GET", "HEAD"], method) && data) {
                    error = new HttpError("Could not add body to the GET|HEAD requests");

                    self.logger.fatal("Http request could not be prepared", {
                        context: options,
                        error:     error,
                        namespace: "http",
                        tags:      "error"
                    });

                    throw error;
                }

                if (!_.isEmpty(query = options.query)) {
                    url = url + (url.indexOf("?") !== -1 ? "&" : "?") + querystring.encode(query);
                }

                xhr = new XMLHttpRequest();

                if (headers = options.headers) {
                    _.forEach(headers, function(value, key) {
                        xhr.setRequestHeader(key, value);
                    });
                }

                if (timeout = options.timeout) {
                    xhr.timeout = timeout;
                }

                xhr.ontimeout = function() {
                    reject(new TimeoutError());
                };

                xhr.onabort = function() {
                    reject(new HttpError("Aborted"));
                };

                xhr.onerror = function(err) {
                    reject(new HttpError());
                };

                xhr.onreadystatechange = function() {
                    var status, body, headers, length;

                    // not interesting state
                    if (this.readyState != 4) {
                        return;
                    }

                    status = this.status;
                    body = this.responseText;
                    headers = self.extractHeaders(xhr.getAllResponseHeaders())
                    length = self.byteLength(body) / 1024;

                    self.logger.debug("Received http response", { namespace: "http", tags: "http,response", context: _.extend({
                        duration: self.getTime() - start,
                        body:     length < 10 ? body : "...",
                        length:   Math.ceil(length) + "KB",
                        status:   status,
                        headers:  headers
                    }, commonLog)});

                    resolve({
                        body: body,
                        statusCode: status,
                        headers: headers
                    });
                }

                self.logger.debug("Sending http request", {
                    context:   _.extend({}, options, commonLog),
                    namespace: "http",
                    tags:      "http,request"
                });

                try {
                    xhr.open(method, url, true);                    
                } catch (err) {
                    reject(err);
                    return
                }

                if (auth = options.auth) {
                    xhr.setRequestHeader("Authorization", self.getAuthString(auth.username, auth.password));
                }

                xhr.send(data);
            });
        },

        /**
         * @protected
         * @returns {number}
         */
        getTime: function() {
            return (new Date()).getTime();
        },

        /**
         * @protected
         * @param str
         * @returns {number}
         */
        byteLength: function(str) {
            // returns the byte length of an utf8 string
            var s = str.length;
            for (var i=str.length-1; i>=0; i--) {
                var code = str.charCodeAt(i);
                if (code > 0x7f && code <= 0x7ff) s++;
                else if (code > 0x7ff && code <= 0xffff) s+=2;
                if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
            }
            return s;
        },

        /**
         * @protected
         * @param headersString
         */
        extractHeaders: (function() {
            var pattern;

            pattern = /([a-z\-]+):\s*([^\n]+)\n?/gi;

            return function(headersString) {
                var headers, match;

                headers = {};

                while (match = pattern.exec(headersString)) {
                    headers[match[1].toLowerCase()] = match[2];
                }

                return headers;
            }
        })(),

        getAuthString: function(username, password) {
            return "Basic " + btoa([username, password].map(function(item){ return decodeURIComponent(item)}).join(':'))
        }
    }
);

exports.XhrHttp = XhrHttp;

},{"./error":26,"./error/timeout":27,"./http":28,"./utils":29,"querystring":"querystring"}],31:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":32}],32:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":33}],33:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],34:[function(require,module,exports){
var extend = require("./utils/extend");

module.exports = function(Parent, protoProps, staticProps) {
    var Child;

    protoProps  = protoProps  || {};
    staticProps = staticProps || {};

    if (protoProps.hasOwnProperty("constructor") && typeof protoProps.constructor === 'function') {
        Child = protoProps.constructor;
    } else {
        Child = function() {
            Parent.apply(this, arguments);
        };
    }

    // set the static props to the new Enum
    extend(Child, Parent, staticProps);

    // create prototype of Child, that created with Parent prototype
    //
    // __proto__  <----  __proto__
    //     ^                 ^
    //     |                 |
    //   Parent            Child
    //
    function Surrogate(){}
    Surrogate.prototype = Parent.prototype;
    Child.prototype = new Surrogate();

    // extend prototype
    extend(Child.prototype, protoProps);

    // set constructor directly
    // @see https://developer.mozilla.org/en-US/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
    Child.prototype.constructor = Child;


    return Child;
};
},{"./utils/extend":36}],35:[function(require,module,exports){
/**
 * Each iterator.
 *
 * @param {object}   obj
 * @param {function} func
 * @param {object}  [context]
 *
 * @returns {*}
 */
module.exports = function(obj, func, context) {
    var result;

    context || (context = null);

    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            result = func.call(context, obj[x], x, obj);

            if (result !== undefined) {
                return result;
            }
        }
    }

    return result;
};
},{}],36:[function(require,module,exports){
var each = require("./each");

/**
 * Extends one object by multiple others.
 *
 * @param {object} to
 *
 * @returns {object}
 */
module.exports = function(to) {
    var from = Array.prototype.slice.call(arguments, 1);

    var func = function(value, prop) {
        to[prop] = value;
    };

    for (var x = 0; x < from.length; x++) {
        each(from[x], func);
    }

    return to;
};
},{"./each":35}],37:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (Array.isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

},{}],38:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return Object.keys(obj).map(function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (Array.isArray(obj[k])) {
        return obj[k].map(function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

},{}],"assert":[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && !isFinite(value)) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b)) {
    return a === b;
  }
  var aIsArgs = isArguments(a),
      bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  var ka = objectKeys(a),
      kb = objectKeys(b),
      key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":24}],"events":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"influent":[function(require,module,exports){
var Client            = require("./lib/client/client").Client;
var NetClient         = require("./lib/client/net").NetClient;
var HttpClient        = require("./lib/client/http").HttpClient;
var DecoratorClient   = require("./lib/client/decorator").DecoratorClient;
var Serializer        = require("./lib/serializer/serializer").Serializer;
var LineSerializer    = require("./lib/serializer/line").LineSerializer;
var Str               = require("./lib/type").Str;
var I64               = require("./lib/type").I64;
var F64               = require("./lib/type").F64;
var Bool              = require("./lib/type").Bool;
var Measurement       = require("./lib/measurement").Measurement;
var Batch             = require("./lib/batch").Batch;
var Query             = require("./lib/batch").Query;
var Http              = require("hurl/lib/http").Http;
var XhrHttp           = require("hurl/lib/xhr").XhrHttp;
var Host              = require("./lib/client/host").Host;
var Elector           = require("./lib/client/elector/elector").Elector;
var BaseElector       = require("./lib/client/elector/base").BaseElector;
var RoundRobinElector = require("./lib/client/elector/rr").RoundRobinElector;
var StubElector       = require("./lib/client/elector/stub").StubElector;
var HttpPing          = require("./lib/client/elector/ping/http").HttpPing;
var consistency       = require("./lib/consistency");
var precision         = require("./lib/precision");



var assert = require("assert");
var _ = require("./lib/utils");

exports.Client            = Client;
exports.NetClient         = NetClient;
exports.HttpClient        = HttpClient;
exports.Http              = Http;
exports.XhrHttp           = XhrHttp;
exports.Serializer        = Serializer;
exports.LineSerializer    = LineSerializer;
exports.Measurement       = Measurement;
exports.Host              = Host;
exports.Elector           = Elector;
exports.BaseElector       = BaseElector;
exports.RoundRobinElector = RoundRobinElector;
exports.StubElector       = StubElector;
exports.HttpPing          = HttpPing;
exports.Str               = Str;
exports.I64               = I64;
exports.F64               = F64;
exports.Bool              = Bool;
exports.Batch             = Batch;
exports.Query             = Query;

exports.NANOSECONDS  = precision.NANOSECONDS;
exports.MICROSECONDS = precision.MICROSECONDS;
exports.MILLISECONDS = precision.MILLISECONDS;
exports.SECONDS      = precision.SECONDS;
exports.MINUTES      = precision.MINUTES;
exports.HOURS        = precision.HOURS;

exports.ONE    = consistency.ONE;
exports.ANY    = consistency.ANY;
exports.ALL    = consistency.ALL;
exports.QUORUM = consistency.QUORUM;



function createHost(def) {
    return new Host(def.protocol, def.host, def.port);
}

function resolveHosts(config) {
    var hosts, server;

    server = config.server;
    if (_.isObject(server)) {
        hosts = [createHost(server)];
    } else if (_.isArray(server)) {
        hosts = server.map(createHost);
    } else {
        throw new Error("Object or Array is expected for config.server");
    }

    return hosts;
}

function wrapClient(client, options) {
    // try connection
    return client
        .ping()
        .then(function() {
            var decorator;

            // wrap client
            decorator = new DecoratorClient(options);
            decorator.injectClient(client);

            return decorator;
        });
}



exports.createHttpClient = function(config) {
    var hosts, client, elector,
        election, pingOpt, ping, electorConfig, pingConfig;

    assert(_.isObject(config), "Object is expected for config");

    hosts = resolveHosts(config);

    // create raw client
    client = new HttpClient(_.pick(config, Object.keys(HttpClient.DEFAULTS)));

    // use line serializer
    client.injectSerializer(new LineSerializer());

    

    
    
    //use http lib
    client.injectHttp(new XhrHttp());
    
    

    // use base election strategy
    // with http ping option
    election = config.election;
    if (_.isObject(election)) {
        electorConfig = _.pick(election, Object.keys(BaseElector.DEFAULTS));

        pingOpt = election.ping;
        if (_.isObject(pingOpt)) {
            pingConfig = _.pick(pingOpt, Object.keys(HttpPing.DEFAULTS));
        }
    }

    ping = new HttpPing(pingConfig);

    
    
    
    
    ping.injectHttp(new XhrHttp());
    
    

    elector = new BaseElector(hosts, electorConfig);
    elector.injectPing(ping);

    client.injectElector(elector);

    return wrapClient(client, _.pick(config, DecoratorClient.OPTIONS))
};

},{"./lib/batch":1,"./lib/client/client":2,"./lib/client/decorator":3,"./lib/client/elector/base":4,"./lib/client/elector/elector":5,"./lib/client/elector/ping/http":6,"./lib/client/elector/rr":8,"./lib/client/elector/stub":9,"./lib/client/host":10,"./lib/client/http":11,"./lib/client/net":13,"./lib/consistency":14,"./lib/measurement":15,"./lib/precision":16,"./lib/serializer/line":18,"./lib/serializer/serializer":19,"./lib/type":20,"./lib/utils":21,"assert":"assert","hurl/lib/http":28,"hurl/lib/xhr":30}],"querystring":[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":37,"./encode":38}]},{},[]);

return require("influent");
}));