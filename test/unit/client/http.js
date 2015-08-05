var HttpClient = require("../../../lib/client/http").HttpClient;
var Serializer = require("../../../lib/serializer").Serializer;
var Measurement = require("../../../lib/measurement").Measurement;
var Host = require("../../../lib/host").Host;
var Http = require("hurl/lib/http").Http;
var querystring = require("querystring");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance").Chance();

describe("HttpClient", function() {
    var options, username, password, database;

    beforeEach(function() {
        options = {
            username: (username = chance.word()),
            password: (password = chance.word()),
            database: (database = chance.word())
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
            precision, epoch;

        beforeEach(function() {
            serializer = Object.create(Serializer.prototype);
            http = Object.create(Http.prototype);

            host = new Host("http", "localhost", 8086);

            instance = new HttpClient(options);
            instance.addHost(host);

            instance.injectHttp(http);
            instance.injectSerializer(serializer);
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

        });

        describe("query", function() {
            
            it("should send query", function() {
                var promise, query, getHostStub, requestStub;

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
                promise = instance.query(query, { epoch: (epoch = "s") });
                
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
                        epoch: epoch
                    });
                })
            });
            
        });

    });

});