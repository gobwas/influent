var DecoratorClient = require("../../../lib/client/decorator").DecoratorClient;
var Client = require("../../../lib/client").Client;
var Measurement = require("../../../lib/measurement").Measurement;
var Value = require("../../../lib/value").Value;
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();
var expect = chai.expect;

chai.use(chaiAsPromised);
chai.should();

describe("DecoratorClient", function() {

    describe("constructor", function() {

        it("should return instance", function() {
            var instance;

            // when
            instance = new DecoratorClient();

            // then
            expect(instance).to.be.instanceof(DecoratorClient);
        });

    });

    describe("injectClient", function() {
        var instance;

        beforeEach(function() {
            instance = new DecoratorClient();
        });

        it("should throw error, when client is not a Client", function() {
            // when
            function inject() {
                instance.injectClient({});
            }

            // then
            expect(inject).to.throw("Client is expected");
        });

        it("should set client", function() {
            var client;

            //before
            client = Object.create(Client.prototype);

            // when
            instance.injectClient(client);

            // then
            expect(instance.client).equal(client);
        });

    });

    describe("writeOne", function() {
        var instance, client;

        beforeEach(function() {
            instance = new DecoratorClient();
            client = Object.create(Client.prototype);
            instance.injectClient(client);
        });

        it("should return promise", function() {
            var result;

            //before
            sinon.stub(client, "writeOne", function() { return Promise.resolve(); });

            // when
            result = instance.writeOne(new Measurement("key"));

            // then
            expect(result).instanceof(Promise);
        });

        it("should try cast non typed measurements", function() {
            var result, writeStub, stamp;

            //before
            writeStub = sinon.stub(client, "writeOne", function() { return Promise.resolve(); });

            // when
            result = instance.writeOne({ key: "key", tags: { tag: "tag" }, fields: { field: "field", val: new Value("val") }, timestamp: (stamp = Date.now()) });

            // then
            return result.then(function() {
                var measurement;

                expect(writeStub.callCount).equal(1);

                measurement = writeStub.firstCall.args[0];

                expect(measurement).instanceof(Measurement);
                expect(measurement.timestamp).equal(stamp);
                expect(measurement.key).equal("key");
                expect(measurement.fields).deep.equal({ field: new Value("field"), val: new Value("val") });
                expect(measurement.tags).deep.equal({ tag: "tag" });
            });
        });

        it("should call client", function() {
            var writeStub, promise;

            // before
            writeStub = sinon.stub(client, "writeOne", function() {
                return Promise.resolve();
            });

            // when
            promise = instance.writeOne(new Measurement("key"));

            // then
            return promise
                .then(function() {
                    expect(writeStub.callCount).equal(1);
                });
        });
    });

    describe("writeMany", function() {
        var instance, client;

        beforeEach(function() {
            instance = new DecoratorClient();
            client = Object.create(Client.prototype);
            instance.injectClient(client);
        });

        it("should return promise", function() {
            var result;

            //before
            sinon.stub(client, "writeMany", function() { return Promise.resolve(); });

            // when
            result = instance.writeMany([ new Measurement("key") ]);

            // then
            expect(result).instanceof(Promise);
        });

        it("should call client", function() {
            var packStub, writeStub, measurements, line,
                promise;

            // before
            measurements = [];
            writeStub = sinon.stub(client, "writeMany", function() {
                return Promise.resolve();
            });

            // when
            promise = instance.writeMany(measurements);

            // then
            return promise
                .then(function() {
                    expect(writeStub.callCount).equal(1);
                });
        });
    });

});