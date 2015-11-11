var Elector = require("./elector").Elector;

/**
 * @class StubElector
 * @extends Elector
 */
var StubElector = Elector.extend(
    /**
     * @lends StubElector.prototype
     */
    {
        getHost: function(hosts) {
            return Promise.resolve(this.hosts[0]);
        }
    }
);

exports.StubElector = StubElector;
