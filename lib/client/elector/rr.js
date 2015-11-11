var Elector = require("./elector").Elector;

/**
 * @class RoundRobinElector
 * @extends Elector
 */
var RoundRobinElector = Elector.extend(
    /**
     * @lends RoundRobinElector.prototype
     */
    {
        constructor: function() {
            Elector.prototype.constructor.apply(this, arguments);
            this.index = 0;
        },

        getHost: function(hosts) {
            var host = this.hosts[this.index];
            this.index = (this.index + 1) % this.hosts.length;

            return Promise.resolve(host);
        }
    }
);

exports.RoundRobinElector = RoundRobinElector;
