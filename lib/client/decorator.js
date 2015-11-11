var Client = require("./client").Client;
var assert = require("assert");
var Measurement = require("../measurement").Measurement;
var Value = require("../value").Value;
var _ = require("../utils");
var getInfluxTypeOf = require("../type").getInfluxTypeOf;
var DecoratorClient;

function addField(measurement, field, value) {
    var type;

    if (value instanceof Value) {
        measurement.addField(field, value);
    } else if (_.isObject(value)) {
        if (!_.isUndefined(value.type)) {
            assert(_.isNumber(value.type), "Type should be a number");
            type = value.type;
        } else {
            type = getInfluxTypeOf(value.data);
        }

        measurement.addField(field, new Value(value.data, type));
    } else {
        measurement.addField(field, new Value(value, getInfluxTypeOf(value)));
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

    tags = def.tags;
    if (!_.isUndefined(tags)) {
        assert(_.isObject(tags), "Tags is expected to be an object");

        _.forEachIn(tags, function(value, tag) {
            measurement.addTag(tag, value);
        });
    }

    timestamp = def.time;
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

        write: function(measurements, options) {
            assert(_.isArray(measurements) || _.isObject(measurements), "Array is expected");

            if (_.isObject(measurements)) {
                measurements = [measurements];
            }

            return this.client.write(measurements.map(tryCastMeasurement), options);
        }
    }
);

exports.DecoratorClient = DecoratorClient;
