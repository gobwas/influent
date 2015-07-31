var influent = require("../../index.js");
var expect = require("chai").expect;
var sinon  = require("sinon");
var _      = require("lodash");
var chance = require("chance");

describe("influent", function() {

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
                database: "test"
            })
            .then(function(c) {
                return c.writeOne({ key: 'influent', fields: { value: (new Date).toString() }, timestamp: Date.now() });
            });
    });

});