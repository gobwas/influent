var UDPClient = require("../../../lib/client/udp").UDPClient;
var sinon = require("sinon");

describe("UDPClient", function() {
	var options, username, password, database, max_batch;

    beforeEach(function() {
        options = {
            username:  (username = chance.word()),
            password:  (password = chance.word()),
            database:  (database = chance.word()),
            max_batch: (max_batch = chance.integer({ min: 2, max: 5 }))
        };
    });

	describe("constructor", function() {

	});

	describe("instance", function() {
		var instance, serializer, elector, host;

		beforeEach(function() {
			host = new Host("udp", "localhost", 8844);

			serializer = Object.create(Serializer.prototype);
			elector = Object.create(Elector.prototype);

			instance = new UDPClient(options);
			instance.injectElector(elector);
			instance.injectSerializer(serializer);
			instance.addHost(host);
		});

		describe("ping", function() {

		});

		describe("query", function() {

		});

		describe("writeOne", function() {

		});

		describe("writeMany", function() {
			
		})
	});

});