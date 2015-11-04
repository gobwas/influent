var UdpClient = require("../../../lib/client/udp").UdpClient;
var Udp = require("../../../lib/net/udp/udp").Udp;
var Host = require("../../../lib/client/host").Host;
var Info = require("../../../lib/client/info").Info;
var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Elector = require("../../../lib/client/elector/elector").Elector;
var Measurement = require("../../../lib/measurement").Measurement;
var sinon = require("sinon");
var chai   = require("chai");
var chaiAsPromised = require("chai-as-promised");
var expect = chai.expect;
var _ = require("lodash");
var chance = require("chance").Chance();

chai.use(chaiAsPromised);
chai.should();

describe("UdpClient", function() {
	var options, username, password, database, max_batch;

    beforeEach(function() {
        options = {
            max_batch: (max_batch = chance.integer({ min: 2, max: 5 }))
        };
    });

	describe("constructor", function() {

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
				return instance.query().should.be.rejectedWith("Query is not allowed in udp client")
			});

		});

		describe("write", function() {
			
			it("should call serializer, getHost and then do request", function() {
                var serializeStub, getHostStub, sendStub,
                    line, promise, buf;

                // before
                serializeStub = sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                buf = new Buffer("line\nline");

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                sendStub = sinon.stub(udp, "send", function() {
                    return Promise.resolve();
                });

                // when
                promise = instance.write([ new Measurement("a"), new Measurement("b") ], { safe_limit: buf.length, max_batch: 2});

                // then
                return promise
                    .then(function() {
                        var config;

                        expect(serializeStub.callCount).equal(2);
                        expect(getHostStub.callCount).equal(1);

                        expect(sendStub.callCount).equal(1);

                        expect(sendStub.firstCall.args).deep.equal([
                            "udp4",
                            buf,
                            0,
                            buf.length,
                            host.port,
                            host.address
                        ]);
                    });
            });

		});
	});

});