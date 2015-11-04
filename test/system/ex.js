var influent = require("../../index.js");
var expect = require("chai").expect;
var _      = require("lodash");

function sleep(n) {
    return function() {
        return new Promise(function(resolve) {
            setTimeout(resolve, n);
        });    
    }
}

describe("System tests", function() {

    beforeEach(function() {
        return influent
            .createHttpClient({
                server:{
                    protocol: "http",
                    host:     "localhost",
                    port:     8086
                },
                username: "admin",
                password: "admin",
                database: "test"
            })
            .then(function(client) {
                return client
                    .query("drop database test")
                    .then(function() {
                        return client.query("create database test")
                    });
            });
    });

    it("should work", function() {
        return influent
            .createHttpClient({
                server:{
                    protocol: "http",
                    host:     "localhost",
                    port:     8086
                },
                username: "admin",
                password: "admin",
                database: "test",
                precision: "ms"
            })
            .then(function(client) {
                return client
                    .write({ key: 'sut', fields: { value: "abcd" }, timestamp: 0 })
                    .then(function() {
                        return client.query("select * from sut");
                    })
                    .then(function(result) {
                        expect(JSON.stringify(result)).equal('{"results":[{"series":[{"name":"sut","columns":["time","value"],"values":[["1970-01-01T00:00:00Z","abcd"]]}]}]}');
                    })
            });
    });

    it("should work with udp", function() {
        return Promise
            .all([
                influent.createHttpClient({
                    server:{
                        protocol: "http",
                        host:     "localhost",
                        port:     8086
                    },
                    username: "admin",
                    password: "admin",
                    database: "test"
                }),
                influent.createUdpClient({
                    server:{
                        protocol: "udp4",
                        host:     "localhost",
                        port:     8089
                    }
                })
            ])
            .then(function(list) {
                var httpClient = list[0];
                var udpClient = list[1];

                return udpClient
                    .write({
                        key: "sutudp",
                        value: "hello_udp",
                        timestamp: 0
                    })
                    .then(sleep(5))
                    .then(function() {
                        return httpClient.query("select * from sutudp");
                    })
                    .then(function(result) {
                        expect(JSON.stringify(result)).equal('{"results":[{"series":[{"name":"sutudp","columns":["time","value"],"values":[["1970-01-01T00:00:00Z","hello_udp"]]}]}]}');
                    });
            })
    });

    it("should fail when unauthorized", function() {
        return influent
            .createHttpClient({
                server:{
                    protocol: "http",
                    host:     "localhost",
                    port:     8086
                },
                username: "test",
                password: "test",
                database: "test",
                precision: "ms"
            })
            .then(function(client) {
                return client
                    .write({ key: 'sut', fields: { value: "abcd" }, timestamp: 0 })
                    .catch(function(err) {
                        expect(err.message).equal('InfluxDB unauthorized user');
                    });
            });
    });

});