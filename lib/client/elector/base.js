var Elector = require("./elector").Elector;
var Ping = require("./ping/ping").Ping;
var _ = require("../../utils");
var assert = require("assert");
var BaseElector;

/**
 * @class BaseElector
 * @extends Elector
 */
BaseElector = Elector.extend(
    /**
     * @lends BaseElector.prototype
     */
    {
        constructor: function() {
            Elector.prototype.constructor.apply(this, arguments);
            this.isPending = false;
            this.pending = Promise.resolve();
        },

        injectPing: function(ping) {
            assert(ping instanceof Ping, "Ping is expected");
            this.ping = ping;
        },

        getHost: function() {
            var self = this;

            if (this.hosts.length == 1) {
                return Promise.resolve(this.hosts[0]);
            }

            // prevent long queue
            if (this.isPending) {
                return this.pending;
            }

            if (!this.activeHost || (this.lastHealthCheck + this.options.period) <= Date.now()) {
                this.isPending = true;

                this.pending = _.any(this.hosts.map(function(host) {
                    return self.ping.pong(host)
                        .then(function() {
                            return host;
                        });
                }));

                return this.pending
                    .then(function(host) {
                        self.lastHealthCheck = Date.now();
                        self.activeHost = host;
                        self.isPending = false;

                        return host;
                    });
            }

            return Promise.resolve(this.activeHost);
        }
    },

    {
        DEFAULTS: _.extend({}, Elector.DEFAULTS, {
            period: 30 * 60 * 1000 // 30 minutes
        })
    }
);

exports.BaseElector = BaseElector;
