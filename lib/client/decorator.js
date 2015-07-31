var Client = require("../client").Client;
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

    if (fields = def.fields) {
        assert(_.isObject(fields), "Fields is expected to be an object");

        _.forEachIn(fields, function(value, field) {
            measurement.addField(field, (value instanceof Value) ? value : new Value(value));
        });
    }

    if (tags = def.tags) {
        assert(_.isObject(tags), "Tags is expected to be an object");

        _.forEachIn(tags, function(value, tag) {
            measurement.addTag(tag, value);
        });
    }

    if (timestamp = def.timestamp) {
        if (_.isNumber(timestamp)) {
            measurement.setTimestamp(timestamp);
        } else if (timestamp instanceof Date) {
            measurement.setTimestamp(timestamp.getTime());
        } else {
            throw Error("Number or Date is expected");
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
            return this.client.check();
        },

        writeMany: function(measurements) {
            assert(_.isArray(measurements), "Array is expected");
            return this.client.writeMany(measurements.map(tryCastMeasurement));
        },

        writeOne: function(measurement) {
            return this.client.writeOne(tryCastMeasurement(measurement));
        }
    }
);

exports.DecoratorClient = DecoratorClient;