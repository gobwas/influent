var RoundRobinElector = require("../../../../lib/client/elector/rr").RoundRobinElector;
var Host = require("../../../../lib/client/host").Host;
var _ = require("lodash");
var chai = require("chai");
var expect = chai.expect;


describe("RoundRobinElector", function() {
	var instance, hosts;

	beforeEach(function() {
		hosts = Array.apply(null, new Array(4)).map(function(_, index) {
			return new Host("http", "127.0.0." + index, 8080);
		});

		instance = new RoundRobinElector(hosts);
	});

	describe("getHost", function() {

		it("should round robin on each request", function() {
			return Promise.all(Array.apply(null, new Array(8)).map(function(_, index) {
				return instance
					.getHost()
					.then(function(host) {
						expect(host.host).equal("127.0.0." + (index % 4));
					});
			}));
		});

	});

});