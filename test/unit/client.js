var Client = require("../../lib/client").Client;
var Host = require("../../lib/host").Host;
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance");

describe("Client", function() {
    var options, instance, host, http,
        db, username, password;

    beforeEach(function() {
        options = {
            database: (db = "db"),
            username: (username = "username"),
            password: (password = "password")
        };

        host = new Host("http", "localhost", 8086);

        instance = new Client(options);
    });

    describe("check", function() {

        it("should call query", function() {
            var promise, queryStub;

            queryStub = sinon.stub(instance, "query", function() {
                return Promise.resolve();
            });

            // when
            promise = instance.check();

            // then
            return promise.catch(_.noop).then(function() {
                expect(queryStub.callCount).equal(1);
                expect(queryStub.firstCall.calledWithExactly("show databases")).to.be.true;
            });
        });

        it("should throw an error when db is not exists", function() {
            var promise, queryStub;

            queryStub = sinon.stub(instance, "query", function() {
                return Promise.resolve({
                    "results": [
                        {
                            "series":[
                                {
                                    "columns":["name"],
                                    "values":[["mydb"]]
                                }
                            ]
                        }
                    ]
                });
            });

            // when
            promise = instance.check();

            // then
            return promise
                .then(function() {
                    throw new Error("Should throw!");
                })
                .catch(function(err) {
                    expect(err.message).equal('Database not found: "db"');
                });
        });

    });

});