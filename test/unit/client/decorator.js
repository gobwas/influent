var DecoratorClient = require("../../../lib/client/decorator").DecoratorClient;
var Client = require("../../../lib/client/client").Client;
var Measurement = require("../../../lib/measurement").Measurement;
var Value = require("../../../lib/value").Value;
var type = require("../../../lib/type");
var influent = require("../../../index");
var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();
var expect = chai.expect;

chai.use(chaiAsPromised);
chai.should();

describe("DecoratorClient", function() {
    var options, username, password, database;

    beforeEach(function() {
        options = {
            username: (username = chance.word()),
            password: (password = chance.word()),
            database: (database = chance.word())
        };
    });

    describe("constructor", function() {

        it("should return instance", function() {
            var instance;

            // when
            instance = new DecoratorClient(options);

            // then
            expect(instance).to.be.instanceof(DecoratorClient);
        });

    });

    describe("injectClient", function() {
        var instance;

        beforeEach(function() {
            instance = new DecoratorClient(options);
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

    describe("write", function() {
        var instance, client;

        beforeEach(function() {
            instance = new DecoratorClient(options);
            client = Object.create(Client.prototype);
            instance.injectClient(client);
        });

        it("should return promise", function() {
            var result;

            //before
            sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            // when
            result = instance.write([new Measurement("key")]);

            // then
            expect(result).instanceof(Promise);
        });

        it("should call client", function() {
            var writeStub, promise;

            // before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            // when
            promise = instance.write([]);

            // then
            return promise
                .then(function() {
                    expect(writeStub.callCount).equal(1);
                });
        });

        it("should try cast non typed measurements", function() {
            var writeStub, stamp, promise;

            // before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            // when
            stamp = 0;
            promise = instance.write([
                {
                    key: "key",
                    fields: {
                        some_field: "field",
                        another_field: new Value("field", type.STRING)
                    },
                    tags: {
                        some_tag: "tag"
                    },
                    timestamp: stamp
                }
            ]);

            // then
            return promise
                .then(function() {
                    var measurement;

                    expect(writeStub.callCount).equal(1);

                    measurement = writeStub.firstCall.args[0][0];

                    expect(measurement).instanceof(Measurement);
                    expect(measurement.timestamp).equal(stamp.toString());
                    expect(measurement.key).equal("key");
                    expect(measurement.fields).deep.equal({
                        some_field: new Value("field", type.STRING),
                        another_field: new Value("field", type.STRING)
                    });
                    expect(measurement.tags).deep.equal({
                        some_tag: "tag"
                    });
                });
        });

        it("should cast numerical timestamps to strings", function() {
            var result, writeStub, stamp;

            //before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            stamp = Date.now();

            // when
            result = instance.write([{
                key: "key",
                timestamp: stamp
            }]);

            // then
            return result.then(function() {
                var measurement;

                expect(writeStub.callCount).equal(1);

                measurement = writeStub.firstCall.args[0][0];

                expect(measurement.timestamp).equal(stamp.toString());
            });
        });

        it("should cast json-ified values", function() {
            var writeStub, result;

            // before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            // when
            result = instance.write([{
                key: "key",
                fields: {
                    some_field: {
                        data: 10,
                        type: influent.type.INT64
                    },
                    another_field: {
                        data: "str"
                    }
                }
            }]);

            // then
            return result.then(function() {
                var measurement;

                measurement = writeStub.firstCall.args[0][0];

                expect(measurement.fields).deep.equal({
                    some_field: new Value(10, type.INT64),
                    another_field: new Value("str", type.STRING)
                });
            });
        });

        it("should cast single measurement to array", function() {
            var writeStub, result;

            // before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            // when
            result = instance.write({
                key: "test",
                fields: {
                    foo: "bar"
                }
            });

            return result.then(function() {
                expect(writeStub.firstCall.args[0]).to.be.array;
            });
        });

        it("should cast `value` prop to same named field", function() {
            var writeStub, result;

            //before
            writeStub = sinon.stub(client, "write", function() {
                return Promise.resolve();
            });

            result = instance.write({
                key: "test",
                value: 1,
                fields: {
                    foo: "bar"
                }
            });

            return result.then(function() {
                var cast = writeStub.firstCall.args[0][0];

                expect(cast.key).equal("test");
                expect(cast.fields).deep.equal({
                    value: new Value(1, type.FLOAT64),
                    foo: new Value("bar", type.STRING)
                });
            });

        });
    });

});
