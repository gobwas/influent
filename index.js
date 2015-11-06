var Client          = require("./lib/client/client").Client;
var NetClient       = require("./lib/client/net").NetClient;
var HttpClient      = require("./lib/client/http").HttpClient;
var UdpClient       = require("./lib/client/udp").UdpClient;
var DecoratorClient = require("./lib/client/decorator").DecoratorClient;
var Serializer      = require("./lib/serializer/serializer").Serializer;
var LineSerializer  = require("./lib/serializer/line").LineSerializer;
var Value           = require("./lib/value").Value;
var Measurement     = require("./lib/measurement").Measurement;
var Http            = require("hurl/lib/http").Http;
var NodeHttp        = require("hurl/lib/node").NodeHttp;
var XhrHttp         = require("hurl/lib/xhr").XhrHttp;
var Udp             = require("./lib/net/udp/udp").Udp;
var NodeUdp         = require("./lib/net/udp/node").NodeUdp;
var Host            = require("./lib/client/host").Host;
var Elector         = require("./lib/client/elector/elector").Elector;
var BaseElector     = require("./lib/client/elector/base").BaseElector;
var StubElector     = require("./lib/client/elector/stub").StubElector;
var HttpPing        = require("./lib/client/elector/ping/http").HttpPing;
var CmdPing         = require("./lib/client/elector/ping/cmd").CmdPing;
var type            = require("./lib/type");

var assert = require("assert");
var _ = require("./lib/utils");

exports.type           = type;
exports.Client         = Client;
exports.NetClient      = NetClient;
exports.HttpClient     = HttpClient;
exports.Http           = Http;
exports.NodeHttp       = NodeHttp;
exports.XhrHttp        = XhrHttp;
exports.UdpClient      = UdpClient;
exports.Serializer     = Serializer;
exports.LineSerializer = LineSerializer;
exports.Value          = Value;
exports.Measurement    = Measurement;
exports.Host           = Host;
exports.Elector        = Elector;
exports.BaseElector    = BaseElector;
exports.StubElector    = StubElector;
exports.HttpPing       = HttpPing;
exports.CmdPing        = CmdPing;
exports.Udp            = Udp;
exports.NodeUdp        = NodeUdp;

function createHost(def) {
    return new Host(def.protocol, def.host, def.port);
}

function resolveHosts(config) {
    var hosts, server;

    server = config.server;
    if (_.isObject(server)) {
        hosts = [createHost(server)];
    } else if (_.isArray(server)) {
        hosts = server.map(createHost);
    } else {
        throw new Error("Object or Array is expected for config.server");
    }

    return hosts;
}

function wrapClient(client) {
    // try connection
    return client
        .ping()
        .then(function() {
            var decorator;

            // wrap client
            decorator = new DecoratorClient();
            decorator.injectClient(client);

            return decorator;
        });
}

exports.createUdpClient = function(config) {
    var hosts, server, client, elector,
        election, pingOpt, electorConfig, pingConfig;

    assert(_.isObject(config), "Object is expected for config");

    // prepare hosts
    hosts = resolveHosts(config);

    // create raw client
    client = new UdpClient(_.pick(config, Object.keys(UdpClient.DEFAULTS)));

    // use line serializer
    client.injectSerializer(new LineSerializer());

    // use udp lib
    client.injectUdp(new NodeUdp());

    // use base election strategy
    // with http ping option
    election = config.election;
    if (_.isObject(election)) {
        electorConfig = _.pick(election, Object.keys(BaseElector.DEFAULTS));

        pingOpt = election.ping;
        if (_.isObject(pingOpt)) {
            pingConfig = _.pick(pingOpt, Object.keys(CmdPing.DEFAULTS));
        }
    }

    elector = new BaseElector(hosts, electorConfig);
    elector.injectPing(new CmdPing(pingConfig));

    // use elector
    client.injectElector(elector);

    return wrapClient(client);
};

exports.createHttpClient = function(config) {
    var hosts, client, elector,
        election, pingOpt, ping, electorConfig, pingConfig;

    assert(_.isObject(config), "Object is expected for config");

    hosts = resolveHosts(config);

    // create raw client
    client = new HttpClient(_.pick(config, Object.keys(HttpClient.DEFAULTS)));

    // use line serializer
    client.injectSerializer(new LineSerializer());

    // use http lib
    client.injectHttp(new NodeHttp());

    // use base election strategy
    // with http ping option
    election = config.election;
    if (_.isObject(election)) {
        electorConfig = _.pick(election, Object.keys(BaseElector.DEFAULTS));

        pingOpt = election.ping;
        if (_.isObject(pingOpt)) {
            pingConfig = _.pick(pingOpt, Object.keys(HttpPing.DEFAULTS));
        }
    }

    ping = new HttpPing(pingConfig);
    ping.injectHttp(new NodeHttp());

    elector = new BaseElector(hosts, electorConfig);
    elector.injectPing(ping);

    client.injectElector(elector);

    return wrapClient(client);
};
