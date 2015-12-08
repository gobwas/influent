var assert = require("assert");
var _ = require("./utils");

var ONE    = "one";
var QUORUM = "quorum";
var ALL    = "all";
var ANY    = "any";

var VALUES = [
    ONE,
    QUORUM,
    ALL,
    ANY
];

exports.ONE    = ONE;
exports.QUORUM = QUORUM;
exports.ALL    = ALL;
exports.ANY    = ANY;

exports.VALUES = VALUES;

exports.isValid = function(consistency) {
    return VALUES.indexOf(consistency) != -1;
};
