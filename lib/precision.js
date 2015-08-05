var assert = require("assert");
var _ = require("./utils");

var NANOSECONDS = 0;
var MICROSECONDS = 1;
var MILLISECONDS = 2;
var SECONDS = 3;
var MINUTES = 4;
var HOURS = 5;

var PRECISION = [
    NANOSECONDS,
    MICROSECONDS,
    MILLISECONDS,
    SECONDS,
    MINUTES,
    HOURS
];

var MAP = {};
MAP[NANOSECONDS]  = "n";
MAP[MICROSECONDS] = "u";
MAP[MILLISECONDS] = "ms";
MAP[SECONDS]      = "s";
MAP[MINUTES]      = "m";
MAP[HOURS]        = "h";

exports.PRECISION = PRECISION;
exports.NANOSECONDS = NANOSECONDS;
exports.MICROSECONDS = MICROSECONDS;
exports.MILLISECONDS = MILLISECONDS;
exports.SECONDS = SECONDS;
exports.MINUTES = MINUTES;
exports.HOURS = HOURS;
exports.MAP = MAP;

exports.assert = function(precision, nullable, msg) {
    var values = _.values(MAP);
    assert((nullable ? precision == null : false) || values.indexOf(precision) != -1, msg.replace("%values%", values.join(",")));
};