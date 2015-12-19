var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Elector = require("../../../lib/client/elector/elector").Elector;
var Host = require("../../../lib/client/elector/elector").Host;
var NetClient = require("../../../lib/client/net").NetClient;
var expect = require("chai").expect;

describe("NetClient", function() {

    describe("injectors", function() {
        var instance;

        beforeEach(function() {
            instance = new NetClient();
        });

        describe("injectSerializer", function() {
            it("should throw error, when serializer is not a Serializer", function() {
                // when
                function inject() {
                    instance.injectSerializer({});
                }

                // then
                expect(inject).to.throw("Serializer is expected");
            });

            it("should set serializer", function() {
                var serializer;

                //before
                serializer = Object.create(Serializer.prototype);

                // when
                instance.injectSerializer(serializer);

                // then
                expect(instance.serializer).equal(serializer);
            });
        });

        describe("injectElector", function() {
            it("should throw error, when elector is not a Elector", function() {
                // when
                function inject() {
                    instance.injectElector({});
                }

                // then
                expect(inject).to.throw("Elector is expected");
            });

            it("should set elector", function() {
                var elector;

                //before
                elector = Object.create(Elector.prototype);

                // when
                instance.injectElector(elector);

                // then
                expect(instance.elector).equal(elector);
            });
        });
    });

});
