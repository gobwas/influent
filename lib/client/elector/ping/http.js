var Ping = require("./ping").Ping;
var Host = require("../../host").Host;
var _ = require("../../../utils");
var Http = require("hurl/lib/http").Http;
var assert = require("assert");
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

            // prepare config for the request
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
);

exports.HttpPing = HttpPing;
