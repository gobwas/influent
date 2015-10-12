var Client = require("./client").Client;
var assert   = require("assert");
var Measurement = require("../measurement").Measurement;
var Value = require("../value").Value;
var _      = require("../utils");
var DecoratorClient;

function tryCastMeasurement(def) {
    var key, measurement, fields, tags, timestamp;

    if (def instanceof Measurement) {
        return def;
    }

    assert(_.isObject(def), "Object is expected");
    assert(_.isString(key = def.key), "Key is expected to be a string");

    measurement = new Measurement(key);

    fields = def.fields;
    if (!_.isUndefined(fields)) {
        assert(_.isObject(fields), "Fields is expected to be an object");

        _.forEachIn(fields, function(value, field) {
            if (value instanceof Value) {
                measurement.addField(field, value);
            } else if (_.isObject(value)) {
                measurement.addField(field, new Value(value.data, value.type));
            } else {
                measurement.addField(field, new Value(value));
            }
        });
    }

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
 * @extends Client
 */
DecoratorClient = Client.extend(
    /**
     * @lends DecoratorClient.prototype
     */
    {
        injectClient: function(client) {
            assert(client instanceof Client, "Client is expected");
            this.client = client;
        },

        query: function(query) {
            return this.client.query(query);
        },

        ping: function() {
            return this.client.ping();
        },

        writeMany: function(measurements, options) {
            assert(_.isArray(measurements), "Array is expected");
            return this.client.writeMany(measurements.map(tryCastMeasurement), options);
        },

        writeOne: function(measurement, options) {
            return this.client.writeOne(tryCastMeasurement(measurement), options);
        }
    }
);

exports.DecoratorClient = DecoratorClient;