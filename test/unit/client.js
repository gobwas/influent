var Client = require("../../lib/client/client").Client;
var Host = require("../../lib/client/host").Host;
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

});