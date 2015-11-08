//[ if BUILD_TARGET == "node" ]
var cuculus = require("cuculus");
var sinon = require("sinon");
var chai = require("chai");
var expect = chai.expect;

describe("NodeUdp", function() {

    describe("send", function() {
        var dns, dgram, NodeUdp, instance;

        beforeEach(function() {
            cuculus.replace("dns", {
                lookup: function(address, cb) {}
            });

            cuculus.replace("dgram", {
                createSocket: function(type) {}
            });

            dns = require("dns");
            dgram = require("dgram");

            cuculus.drop("../../../lib/net/udp/node");
            NodeUdp = require("../../../lib/net/udp/node").NodeUdp;

            instance = new NodeUdp();
        });

        afterEach(function() {
            cuculus.drop("dns");
            cuculus.drop("dgram");
            cuculus.drop("../../../lib/net/udp/node");
        });

        it("should lookup address", function() {
            var host, port, buffer,
            address, family, lookupStub,
            createSocketStub, socket;

            // before
            host = "localhost";
            port = 8080;
            buffer = new Buffer("");

            address = "127.0.0.1";
            family = 4;

            lookupStub = sinon.stub(dns, "lookup", function(host, cb) {
                cb(null, address, family);
            });

            socket = {
                send: sinon.spy(function(buffer, offset, length, port, address, cb) {
                    cb();
                })
            };

            createSocketStub = sinon.stub(dgram, "createSocket", function(type) {
                return socket;
            });

            // when
            var result = instance.send(host, port, buffer, 0, buffer.length);

            //then
            return result.then(function() {
                expect(lookupStub.callCount).equal(1);
                expect(lookupStub.firstCall.args[0]).equal(host);

                expect(createSocketStub.callCount).equal(1);
                expect(createSocketStub.firstCall.args[0]).equal("udp" + family);

                expect(socket.send.callCount).equal(1);
                expect(socket.send.firstCall.args.slice(0, 5)).deep.equal([
                    buffer,
                    0,
                    buffer.length,
                    port,
                    address
                ]);

                expect(lookupStub.calledBefore(createSocketStub)).to.be.true;
                expect(createSocketStub.calledBefore(socket.send)).to.be.true;
            });
        });
    });

});
//[ endif ]
