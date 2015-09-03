var LineSerializer = require("../../../lib/serializer/line").LineSerializer;
var Measurement = require("../../../lib/measurement").Measurement;
var Value = require("../../../lib/value").Value;
var type = require("../../../lib/type");
var chai   = require("chai");
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();

chai.use(chaiAsPromised);
chai.should();

describe("LineSerializer", function() {

    describe("serialize", function() {
        var instance;

        beforeEach(function() {
            instance = new LineSerializer();
        });

        it("should become a string", function() {
            var result;

            // when
            result = instance.serialize(new Measurement("key"));

            // then
            return expect(result).to.eventually.be.a("string");
        });

        // The key is the measurement name and any optional tags separated by commas.
        // Measurement names, tag keys, and tag values must escape any spaces or commas using a backslash (\).
        // For example: \ and \,. All tag values are stored as strings and should not be surrounded in quotes.
        // Field keys are always strings and follow the same syntactical rules as described above for tag keys and values.
        it("should escape keys", function() {
            var measurement, result;

            // when
            measurement = new Measurement("cpu,0 1");
            measurement.addTag("server A,1", "my, cool, server");
            measurement.addField("value A,1", new Value("str"));
            result = instance.serialize(measurement);

            // then
            return result.should.become("cpu\\,0\\ 1,server\\ A\\,1=my\\,\\ cool\\,\\ server value\\ A\\,1=\"str\"");
        });

        it("should parse as boolean", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value(true, type.BOOLEAN));
            result = instance.serialize(measurement);

            return result.should.become("key field=t");
        });

        it("should parse as string", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value("str", type.STRING));
            result = instance.serialize(measurement);

            return result.should.become("key field=\"str\"");
        });

        it("should parse as int64", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value(1, type.INT64));
            result = instance.serialize(measurement);

            return result.should.become("key field=1i");
        });

        it("should parse as float64", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value(1.1, type.FLOAT64));
            result = instance.serialize(measurement);

            return result.should.become("key field=1.1");
        });

        it("should parse numbers as float64 by default", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value(1));
            result = instance.serialize(measurement);

            return result.should.become("key field=1");
        });

        it("should parse as float64, even if it is without decimal", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("field", new Value(1, type.FLOAT64));
            result = instance.serialize(measurement);

            return result.should.become("key field=1");
        });

        it("should sort keys of tags", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addTag("b", "1");
            measurement.addTag("a", "0");
            result = instance.serialize(measurement);

            // then
            return result.should.become("key,a=0,b=1")
        });

        it("should sort keys of fields", function() {
            var result, measurement;

            // when
            measurement = new Measurement("key");
            measurement.addField("b", new Value(1));
            measurement.addField("a", new Value(0));
            result = instance.serialize(measurement);

            // then
            return result.should.become("key a=0,b=1");
        });

        it("should allow strings for timestamps", function() {
            var result, measurement, stamp;

            // when
            stamp = "1441236081554000001";
            measurement = new Measurement("key");
            measurement.addField("a", new Value(0));
            measurement.setTimestamp(stamp);
            result = instance.serialize(measurement);

            // then
            return result.should.become("key a=0 1441236081554000001");
        });

    });

});
