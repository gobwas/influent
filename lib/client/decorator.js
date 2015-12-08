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
