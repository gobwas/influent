var Client          = require("./lib/client/client").Client;
var HttpClient      = require("./lib/client/http").HttpClient;
var DecoratorClient = require("./lib/client/decorator").DecoratorClient;
var Serializer      = require("./lib/serializer/serializer").Serializer;
var LineSerializer  = require("./lib/serializer/line").LineSerializer;
var Value           = require("./lib/value").Value;
var Measurement     = require("./lib/measurement").Measurement;
var Http            = require("hurl/lib/node").NodeHttp;
var Host            = require("./lib/client/host").Host;
var type            = require("./lib/type");

var assert = require("assert");
var _ = require("./lib/utils");

exports.Client         = Client;
exports.HttpClient     = HttpClient;
exports.Serializer     = Serializer;
exports.LineSerializer = LineSerializer;
exports.Value          = Value;
exports.Measurement    = Measurement;
exports.Host           = Host;
exports.type           = type;


function createHost(def) {
    return new Host(def.protocol, def.host, def.port);
}

exports.createClient = function(config) {
    var hosts, server, client;

    assert(_.isObject(config), "Object is expected for config");

    server = config.server;

    if (_.isObject(server)) {
        hosts = [ createHost(server) ];
    } else if (_.isArray(server)) {
        hosts = server.map(createHost);
    } else {
        throw new Error("Object or Array is expected for config.server");
    }

    client = new HttpClient(config);

    client.injectSerializer(new LineSerializer());
    client.injectHttp(new Http());

    hosts.forEach(function(host) {
        client.addHost(host);
    });

    return client
        .ping()
        .then(function() {
            var decorator;

            decorator = new DecoratorClient();
            decorator.injectClient(client);

            return decorator;
        });
};
