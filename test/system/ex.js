var influent = require("../../index.js");
var expect = require("chai").expect;
var _      = require("lodash");

describe("influent", function() {

    beforeEach(function() {
        return influent
            .createClient({
                server:{
                    protocol: "http",
                    host:     "localhost",
                    port:     8086
                },
                username: "user",
                password: "password",
                database: "test"
            })
            .then(function(client) {
                return client
                    .query("drop database test")
                    .then(function() {
                        return client.query("create database test");
                    })
            });
    });

    it("should work", function() {
        return influent
            .createClient({
                server:{
                    protocol: "http",
                    host:     "localhost",
                    port:     8086
                },
                username: "user",
                password: "password",
                database: "test",
                precision: "ms"
            })
            .then(function(client) {
                return client
                    .writeOne({ key: 'sut', fields: { value: "abcd" }, timestamp: 0 })
                    .then(function() {
                        return client.query("select * from sut");
                    })
                    .then(function(result) {
                        expect(JSON.stringify(result)).equal('{"results":[{"series":[{"name":"sut","columns":["time","value"],"values":[["1970-01-01T00:00:00Z","abcd"]]}]}]}');
                    })
            });
    });

});