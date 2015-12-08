var Client            = require("./lib/client/client").Client;
var NetClient         = require("./lib/client/net").NetClient;
var HttpClient        = require("./lib/client/http").HttpClient;
var DecoratorClient   = require("./lib/client/decorator").DecoratorClient;
var Serializer        = require("./lib/serializer/serializer").Serializer;
var LineSerializer    = require("./lib/serializer/line").LineSerializer;
var Str               = require("./lib/type").Str;
var I64               = require("./lib/type").I64;
var F64               = require("./lib/type").F64;
var Bool              = require("./lib/type").Bool;
var Measurement       = require("./lib/measurement").Measurement;
var Batch             = require("./lib/batch").Batch;
var Query             = require("./lib/batch").Query;
var Http              = require("hurl/lib/http").Http;
var XhrHttp           = require("hurl/lib/xhr").XhrHttp;
var Host              = require("./lib/client/host").Host;
var Elector           = require("./lib/client/elector/elector").Elector;
var BaseElector       = require("./lib/client/elector/base").BaseElector;
var RoundRobinElector = require("./lib/client/elector/rr").RoundRobinElector;
var StubElector       = require("./lib/client/elector/stub").StubElector;
var HttpPing          = require("./lib/client/elector/ping/http").HttpPing;
var consistency       = require("./lib/consistency");
var precision         = require("./lib/precision");

//[ if BUILD_TARGET == "node" ]
var UdpClient = require("./lib/client/udp").UdpClient;
var NodeHttp  = require("hurl/lib/node").NodeHttp;
var Udp       = require("./lib/net/udp/udp").Udp;
var NodeUdp   = require("./lib/net/udp/node").NodeUdp;
var CmdPing   = require("./lib/client/elector/ping/cmd").CmdPing;
//[ endif ]

var assert = require("assert");
var _ = require("./lib/utils");

exports.Client            = Client;
exports.NetClient         = NetClient;
exports.HttpClient        = HttpClient;
exports.Http              = Http;
exports.XhrHttp           = XhrHttp;
exports.Serializer        = Serializer;
exports.LineSerializer    = LineSerializer;
exports.Measurement       = Measurement;
exports.Host              = Host;
exports.Elector           = Elector;
exports.BaseElector       = BaseElector;
exports.RoundRobinElector = RoundRobinElector;
exports.StubElector       = StubElector;
exports.HttpPing          = HttpPing;
exports.Str               = Str;
exports.I64               = I64;
exports.F64               = F64;
exports.Bool              = Bool;
exports.Batch             = Batch;
exports.Query             = Query;

exports.NANOSECONDS  = precision.NANOSECONDS;
exports.MICROSECONDS = precision.MICROSECONDS;
exports.MILLISECONDS = precision.MILLISECONDS;
exports.SECONDS      = precision.SECONDS;
exports.MINUTES      = precision.MINUTES;
exports.HOURS        = precision.HOURS;

exports.ONE    = consistency.ONE;
exports.ANY    = consistency.ANY;
exports.ALL    = consistency.ALL;
exports.QUORUM = consistency.QUORUM;

//[ if BUILD_TARGET == "node" ]
exports.UdpClient = UdpClient;
exports.NodeHttp  = NodeHttp;
exports.Udp       = Udp;
exports.NodeUdp   = NodeUdp;
exports.CmdPing   = CmdPing;
//[ endif ]

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

function wrapClient(client, options) {
    // try connection
    return client
        .ping()
        .then(function() {
            var decorator;

            // wrap client
            decorator = new DecoratorClient(options);
            decorator.injectClient(client);

            return decorator;
        });
}

//[ if BUILD_TARGET == "node" ]
exports.createUdpClient = function(config) {
    var hosts, client, elector,
        election, electorConfig;

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
        electorConfig = _.pick(election, Object.keys(RoundRobinElector.DEFAULTS));
    }

    elector = new RoundRobinElector(hosts, electorConfig);

    // use elector
    client.injectElector(elector);

    return wrapClient(client, _.pick(config, DecoratorClient.OPTIONS));
};
//[ endif ]

exports.createHttpClient = function(config) {
    var hosts, client, elector,
        election, pingOpt, ping, electorConfig, pingConfig;

    assert(_.isObject(config), "Object is expected for config");

    hosts = resolveHosts(config);

    // create raw client
    client = new HttpClient(_.pick(config, Object.keys(HttpClient.DEFAULTS)));

    // use line serializer
    client.injectSerializer(new LineSerializer());

    //[ if BUILD_TARGET == "node" ]
    // use http lib
    client.injectHttp(new NodeHttp());
    //[ endif ]

    //[ if BUILD_TARGET == "browser" ]
    //[ js ]
    /// use http lib
    // client.injectHttp(new XhrHttp());
    //[ endjs ]
    //[ endif ]

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

    //[ if BUILD_TARGET == "node" ]
    ping.injectHttp(new NodeHttp());
    //[ endif ]
    
    //[ if BUILD_TARGET == "browser" ]
    //[ js ]
    // ping.injectHttp(new XhrHttp());
    //[ endjs ]
    //[ endif ]

    elector = new BaseElector(hosts, electorConfig);
    elector.injectPing(ping);

    client.injectElector(elector);

    return wrapClient(client, _.pick(config, DecoratorClient.OPTIONS))
};
