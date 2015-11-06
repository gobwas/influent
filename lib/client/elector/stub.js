var Elector = require("./elector").Elector;
var Host = require("../host").Host;
var StubElector;

/**
 * @class StubElector
 * @extends Elector
 */
StubElector = Elector.extend(
    /**
     * @lends StubElector.prototype
     */
    {
        getHost: function(hosts) {
            var host = hosts[0];
            assert(host instanceof Host, "Host is expected");
            return Promise.resolve(host);
        }
    }
);

exports.StubElector = StubElector;
