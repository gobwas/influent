var assert = require("assert");
var _ = require("./utils");

var NANOSECONDS  = "n";
var MICROSECONDS = "u";
var MILLISECONDS = "ms";
var SECONDS      = "s";
var MINUTES      = "m";
var HOURS        = "h";

var VALUES = [
    NANOSECONDS,
    MICROSECONDS,
    MILLISECONDS,
    SECONDS,
    MINUTES,
    HOURS
];

exports.NANOSECONDS = NANOSECONDS;
exports.MICROSECONDS = MICROSECONDS;
exports.MILLISECONDS = MILLISECONDS;
exports.SECONDS = SECONDS;
exports.MINUTES = MINUTES;
exports.HOURS = HOURS;

exports.VALUES = VALUES;

exports.isValid = function(precision) {
    return VALUES.indexOf(precision) != -1;
};
