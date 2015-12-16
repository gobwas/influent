var Client = require("./client").Client;
var Host = require("./host").Host;
var Elector = require("./elector/elector").Elector;
var Serializer = require("../serializer/serializer").Serializer;
var _ = require("../utils");
var assert = require("assert");
var NetClient;

/**
 * @class NetClient
 * @extends Client
 */
NetClient = Client.extend(
    /**
     * @lends NetClient.prototype
     */
    {
        constructor: function() {
            Client.prototype.constructor.apply(this, arguments);
            this.hosts = [];
        },

        injectSerializer: function(serializer) {
            assert(serializer instanceof Serializer, "Serializer is expected");
            this.serializer = serializer;
        },

        injectElector: function(elector) {
            assert(elector instanceof Elector, "Elector is expected");
            this.elector = elector;
        }
    }
);

exports.NetClient = NetClient;
