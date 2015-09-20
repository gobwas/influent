var HttpClient = require("../../../lib/client/http").HttpClient;
var Pong = require("../../../lib/client/pong").Pong;
var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Measurement = require("../../../lib/measurement").Measurement;
var Host = require("../../../lib/client/host").Host;
var Http = require("hurl/lib/http").Http;
var querystring = require("querystring");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();

describe("HttpClient", function() {
    var options, username, password, database, max_batch;

    beforeEach(function() {
        options = {
            username:  (username = chance.word()),
            password:  (password = chance.word()),
            database:  (database = chance.word()),
            max_batch: (max_batch = chance.integer({ min: 2, max: 5 }))
        };
    });

    describe("injectors", function() {

        describe("injectSerializer", function() {
            var instance;

            beforeEach(function() {
                instance = new HttpClient(options);
            });

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

        describe("injectHttp", function() {
            var instance;

            beforeEach(function() {
                instance = new HttpClient(options);
            });

            it("should throw error, when http is not a Http", function() {
                // when
                function inject() {
                    instance.injectHttp({});
                }

                // then
                expect(inject).to.throw("Http is expected");
            });

            it("should set http", function() {
                var http;

                //before
                http = Object.create(Http.prototype);

                // when
                instance.injectHttp(http);

                // then
                expect(instance.http).equal(http);
            });
        });

    });


    describe("methods", function() {
        var instance, host, serializer, http,
            precision;

        beforeEach(function() {
            serializer = Object.create(Serializer.prototype);
            http = Object.create(Http.prototype);

            host = new Host("http", "localhost", 8086);

            instance = new HttpClient(options);
            instance.addHost(host);

            instance.injectHttp(http);
            instance.injectSerializer(serializer);
        });

        describe("ping", function() {

            it("should make request on each host", function() {
                var instance, hostA, hostB, hostC, hostAStr, hostBStr, hostCStr, hostAPong, hostBPong, hostCPong,
                    requestStub, promise, expectations;

                // before
                hostA = new Host("http", "127.0.0.1", 8186);
                hostB = new Host("http", "127.0.0.2", 8286);
                hostC = new Host("http", "127.0.0.3", 8386);
                hostAStr = "http://127.0.0.1:8186/ping";
                hostBStr = "http://127.0.0.2:8286/ping";
                hostCStr = "http://127.0.0.3:8386/ping";

                instance = new HttpClient(options);
                instance.injectHttp(http);
                instance.addHost(hostA);
                instance.addHost(hostB);
                instance.addHost(hostC);

                requestStub = sinon.stub(http, "request", function(url) {
                    switch (url) {
                        case hostAStr: {
                            return Promise.resolve({
                                statusCode: 204,
                                headers: {
                                    "x-influxdb-version": "0.9.3-nightly-548b898",
                                    "date": "Fri, 04 Sep 2015 18:48:02 GMT"
                                }
                            });
                        }
                        case hostBStr: {
                            return Promise.resolve({
                                statusCode: 500,
                                body: "Internal server error"
                            });
                        }
                        case hostCStr: {
                            return Promise.reject({
                                code: "ECONNREFUSED"
                            });
                        }
                        default: {
                            return Promise.reject();
                        }
                    }
                });

                hostAPong = new Pong(true);
                hostAPong.setVersion("0.9.3-nightly-548b898");
                hostAPong.setDate(new Date("Fri, 04 Sep 2015 18:48:02 GMT"));

                hostBPong = new Pong(false);
                hostBPong.setInfo("500: Internal server error");

                hostCPong = new Pong(false);
                hostCPong.setInfo("ECONNREFUSED")

                expectations = [
                    {host: hostA, status: hostAPong},
                    {host: hostB, status: hostBPong},
                    {host: hostC, status: hostCPong}
                ];

                // when
                promise = instance.ping();

                // then
                return promise.then(function(list) {
                    expect(requestStub.callCount).equal(3);
                    expect(requestStub.getCall(0).args[0]).equal("http://127.0.0.1:8186/ping");
                    expect(requestStub.getCall(1).args[0]).equal("http://127.0.0.2:8286/ping");
                    expect(requestStub.getCall(2).args[0]).equal("http://127.0.0.3:8386/ping");

                    expect(list).to.deep.equal(expectations);
                });
            });

        });

        describe("writeOne", function() {

            it("should call serializer, getHost and then do request", function() {
                var serializeStub, getHostStub, requestStub,
                    promise;

                // before
                serializeStub = sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                getHostStub = sinon.stub(instance, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 204
                    });
                });

                // when
                promise = instance.writeOne(new Measurement("key"), { precision: (precision = "s") });

                // then
                return promise
                    .then(function() {
                        var config;

                        expect(serializeStub.callCount).equal(1);
                        expect(getHostStub.callCount).equal(1);

                        expect(requestStub.callCount).equal(1);
                        expect(requestStub.firstCall.args[0]).equal(host.toString() + "/write");

                        config = requestStub.firstCall.args[1];

                        expect(_.omit(config, "data")).to.deep.equal({
                            "method": "POST",
                            "auth": {
                                "username": username,
                                "password": password
                            },
                            "query": {
                                "db": database,
                                "precision": precision
                            }
                        });

                        expect(config.data).equal("line");
                    });
            });

        });

        describe("writeMany", function() {

            it("should call serializer, getHost and then do request", function() {
                var serializeStub, getHostStub, requestStub,
                    line, promise;

                // before
                serializeStub = sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                getHostStub = sinon.stub(instance, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 204
                    });
                });

                // when
                promise = instance.writeMany([ new Measurement("a"), new Measurement("b") ], { precision: (precision = "s") });

                // then
                return promise
                    .then(function() {
                        var config;

                        expect(serializeStub.callCount).equal(2);
                        expect(getHostStub.callCount).equal(1);

                        expect(requestStub.callCount).equal(1);
                        expect(requestStub.firstCall.args[0]).equal(host.toString() + "/write");

                        config = requestStub.firstCall.args[1];

                        expect(_.omit(config, "data")).to.deep.equal({
                            "method": "POST",
                            "auth": {
                                "username": username,
                                "password": password
                            },
                            "query": {
                                "db": database,
                                "precision": precision
                            }
                        });

                        expect(config.data).equal("line\nline");
                    });
            });

            it("should batch requests", function() {
                var requestStub, line, promise, points;

                // before
                sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                sinon.stub(instance, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 204
                    });
                });

                // when
                points = [
                    new Measurement("a"),
                    new Measurement("b"),
                    new Measurement("c"),
                    new Measurement("d"),
                    new Measurement("e"),
                    new Measurement("f"),
                    new Measurement("g"),
                    new Measurement("h"),
                    new Measurement("i"),
                    new Measurement("j")
                ];

                promise = instance.writeMany(points);

                // then
                return promise
                    .then(function() {
                        expect(requestStub.callCount).equal(Math.ceil(points.length / max_batch));
                    });
            });

            it("should batch requests by given option", function() {
                var requestStub, line, promise, points;

                // before
                sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                sinon.stub(instance, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 204
                    });
                });

                // when
                points = [
                    new Measurement("a"),
                    new Measurement("b"),
                    new Measurement("c"),
                    new Measurement("d"),
                    new Measurement("e"),
                    new Measurement("f"),
                    new Measurement("g"),
                    new Measurement("h"),
                    new Measurement("i"),
                    new Measurement("j")
                ];

                promise = instance.writeMany(points, { max_batch: 5 });

                // then
                return promise
                    .then(function() {
                        expect(requestStub.callCount).equal(2);
                    });
            });

        });

        describe("query", function() {

            it("should send query", function() {
                var epoch, chunk_size, promise, query, getHostStub, requestStub;

                // before
                query = chance.word();

                getHostStub = sinon.stub(instance, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 200,
                        body: "{}"
                    });
                });

                // when
                promise = instance.query(query, { epoch: (epoch = "s"), chunk_size: (chunk_size = 5000) });

                // then
                return promise.then(function() {
                    var config;

                    expect(getHostStub.callCount).equal(1);
                    expect(requestStub.firstCall.args[0]).equal(host.toString() + "/query");

                    config = requestStub.firstCall.args[1];

                    // avoid to request some overhead options
                    expect(_.omit(config, "query", "auth")).to.deep.equal({
                        "method": "GET"
                    });

                    expect(config.auth).to.deep.equal({
                        username: username,
                        password: password
                    });

                    expect(config.query).to.deep.equal({
                        db: database,
                        q:  query,
                        epoch: epoch,
                        chunk_size: chunk_size
                    });
                })
            });

        });

    });

});