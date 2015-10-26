var Ping = require("./ping");
var Host = require("../../host");
var Http = require("hurl/lib/http").Http;
var HttpPing;

/**
 * @class HttpPing
 * @extends Ping
 */
HttpPing = Ping.extend(
	/**
	 * @lends HttpPing.prototype
	 */
	{
		injectHttp: function(http) {
            assert(http instanceof Http, "Http is expected");
            this.http = http;
        },

		pong: function(host) {
			var config;

			assert(host instanceof Host, "Host is expected");

			config = _.pick(this.options, ["timeout"]);		
			return this.http.request(host.toString(), config)
				.then(function() {
					return;
				});
		}
	},

	{
		DEFAULTS: _.extend({}, Ping.DEFAULTS, {
			timeout: 5
		})
	}
)

exports.HttpPing = HttpPing;