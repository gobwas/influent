var HttpClient = require("../../../lib/client/http").HttpClient;
var Info = require("../../../lib/client/info").Info;
var Serializer = require("../../../lib/serializer/serializer").Serializer;
var Elector = require("../../../lib/client/elector/elector").Elector;
var Measurement = require("../../../lib/measurement").Measurement;
var Host = require("../../../lib/client/host").Host;
var Http = require("hurl/lib/http").Http;
var Query = require("../../../lib/query").Query;
var Batch = require("../../../lib/batch").Batch;
var querystring = require("querystring");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();

describe("HttpClient", function() {
    var options, username, password;

    beforeEach(function() {
        options = {
            username:  (username = chance.word()),
            password:  (password = chance.word())
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
        var instance, host, serializer, http, elector;

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
                    getHostStub, requestStub, promise;

                // before
                host = new Host("http", "127.0.0.1", 8186);

                getHostStub = sinon.stub(elector, "getHost", function() {
                    return Promise.resolve(host);
                });

                requestStub = sinon.stub(http, "request", function(url) {
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
                    batch, line, promise,
                    database, precision, rp, consistency;

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
                batch = new Batch({
                    database:    (database = "db"),
                    rp:          (rp = "rp"),
                    consistency: (consistency = "one"),
                    precision:   (precision = "s")
                });
                batch.add(new Measurement("a"));
                batch.add(new Measurement("b"));

                promise = instance.write(batch);

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
                                db:          database,
                                precision:   precision,
                                consistency: consistency,
                                rp:          rp
                            }
                        });

                        expect(config.data).equal("line\nline");
                    });
            });

        });

        describe("query", function() {

            it("should send query", function() {
                var command, database, chunk_size, epoch,
                    promise, query, getHostStub, requestStub;

                // before
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
                query = new Query((command = chance.word()), {
                    database:   (database = "db"),
                    chunk_size: (chunk_size = 5000),
                    epoch:      (epoch = "ms")
                });
                promise = instance.query(query);

                // then
                return promise.then(function() {
                    var config;

                    expect(getHostStub.callCount).equal(1);
                    expect(requestStub.firstCall.args[0]).equal(host.toString() + "/query");

                    config = requestStub.firstCall.args[1];

                    expect(_.omit(config, "data")).to.deep.equal({
                        method: "GET",
                        auth: {
                            username: username,
                            password: password
                        },
                        query: {
                            db:         database,
                            q:          command,
                            epoch:      epoch,
                            chunk_size: chunk_size
                        }
                    });
                });
            });

        });

    });

});
