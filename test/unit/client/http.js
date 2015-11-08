var HttpClient = require("../../../lib/client/http").HttpClient;
var Info = require("../../../lib/client/info").Info;
var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Elector = require("../../../lib/client/elector/elector").Elector;
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
        var instance;

        beforeEach(function() {
            instance = new HttpClient(options);
        });

        describe("injectHttp", function() {
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
            precision, elector;

        beforeEach(function() {
            serializer = Object.create(Serializer.prototype);
            http = Object.create(Http.prototype);
            elector = Object.create(Elector.prototype);

            host = new Host("http", "localhost", 8086);

            instance = new HttpClient(options);
            instance.injectHttp(http);
            instance.injectSerializer(serializer);
            instance.injectElector(elector);
        });

        describe("ping", function() {

            it("should make request on each host", function() {
                var host, info,
                    getHostStub, requestStub, promise, expectations;

                // before
                host = new Host("http", "127.0.0.1", 8186);

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function(url) {
                    var err;

                    switch (url) {
                        case "http://127.0.0.1:8186/ping": {
                            return Promise.resolve({
                                statusCode: 204,
                                headers: {
                                    "x-influxdb-version": "0.9.3-nightly-548b898",
                                    date: "Fri, 04 Sep 2015 18:48:02 GMT"
                                }
                            });
                        }

                        default: {
                            return Promise.reject(new Error("No such host"));
                        }
                    }
                });

                info = new Info();
                info.setVersion("0.9.3-nightly-548b898");
                info.setDate(new Date("Fri, 04 Sep 2015 18:48:02 GMT"));

                // when
                promise = instance.ping();

                // then
                return promise.then(function(i) {
                    expect(requestStub.callCount).equal(1);
                    expect(requestStub.getCall(0).args[0]).equal("http://127.0.0.1:8186/ping");
                    expect(i).to.deep.equal({
                        host: host,
                        info: info
                    });
                });
            });

        });

        describe("write", function() {

            it("should call serializer, getHost and then do request", function() {
                var serializeStub, getHostStub, requestStub,
                    line, promise;

                // before
                serializeStub = sinon.stub(serializer, "serialize", function() {
                    return Promise.resolve("line");
                });

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function() {
                    return Promise.resolve({
                        statusCode: 204
                    });
                });

                // when
                promise = instance.write([new Measurement("a"), new Measurement("b")], { precision: (precision = "s") });

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
                            method: "POST",
                            auth: {
                                username: username,
                                password: password
                            },
                            query: {
                                db: database,
                                precision: precision
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

                sinon.stub(elector, "getHost", function() {
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

                promise = instance.write(points);

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

                sinon.stub(elector, "getHost", function() {
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

                promise = instance.write(points, { max_batch: 5 });

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

                getHostStub = sinon.stub(elector, "getHost", function() {
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
                        method: "GET"
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
                });
            });

        });

    });

});
