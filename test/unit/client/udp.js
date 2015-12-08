//[ if BUILD_TARGET == "node" ]
var UdpClient = require("../../../lib/client/udp").UdpClient;
var Udp = require("../../../lib/net/udp/udp").Udp;
var Host = require("../../../lib/client/host").Host;
var Info = require("../../../lib/client/info").Info;
var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Elector = require("../../../lib/client/elector/elector").Elector;
var Measurement = require("../../../lib/measurement").Measurement;
var Query = require("../../../lib/query").Query;
var Batch = require("../../../lib/batch").Batch;
var sinon = require("sinon");
var chai   = require("chai");
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var _ = require("lodash");
var chance = require("chance").Chance();

chai.use(chaiAsPromised);
chai.should();

describe("UdpClient", function() {
    var options, safe_limit;

    beforeEach(function() {
        options = {
            safe_limit: (safe_limit = chance.integer({ min: 512, max: 1024 }))
        };
    });

    describe("instance", function() {
        var instance, serializer, elector, host, udp;

        beforeEach(function() {
            host = new Host("udp", "localhost", 8844);

            serializer = Object.create(Serializer.prototype);
            elector = Object.create(Elector.prototype);
            udp = Object.create(Udp.prototype);

            instance = new UdpClient(options);
            instance.injectUdp(udp);
            instance.injectElector(elector);
            instance.injectSerializer(serializer);
        });

        describe("ping", function() {

            it("should use elector and return host", function() {
                var getHostStub, result;

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                // when
                result = instance.ping();

                // then
                return result.then(function(h) {
                    expect(h).to.deep.equal({
                        info: new Info(),
                        host: host
                    });

                    expect(getHostStub.callCount).equal(1);
                });
            });

        });

        describe("query", function() {

            it("should return rejected promise", function() {
                return instance.query().should.be.rejectedWith("Query is not allowed in udp client");
            });

        });

        describe("write", function() {

            it("should call serializer, getHost and then do request", function() {
                var serializeStub, getHostStub, sendStub,
                    line, promise, buf, batch;

                // before
                serializeStub = sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                sendStub = sinon.stub(udp, "send", function() {
                    return Promise.resolve();
                });

                // create instance here
                // cause we need to configure safe_limit
                instance = new UdpClient({ safe_limit: 4 });
                instance.injectUdp(udp);
                instance.injectElector(elector);
                instance.injectSerializer(serializer);

                // when
                batch = new Batch();
                batch.add(new Measurement("a"));
                batch.add(new Measurement("b"));

                promise = instance.write(batch);

                // then
                return promise
                    .then(function() {
                        expect(serializeStub.callCount).equal(2);
                        expect(getHostStub.callCount).equal(2);
                        expect(sendStub.callCount).equal(2);

                        _.times(2, function(i) {
                            var buf = new Buffer("line");
                            expect(sendStub.getCall(i).args).deep.equal([
                                host.host,
                                host.port,
                                buf,
                                0,
                                buf.length
                            ]);
                        });
                    });
            });

        });
    });

});
//[ endif ]
