var assert = require("assert");
var _ = require("../utils");

function Pong(status) {
    assert(_.isBoolean(status), "Boolean is expected");
    this.ok = status;
    this.version = null;
    this.date = null;
    this.info = null;
}

Pong.prototype.setVersion = function(version) {
    assert(_.isString(version), "String is expected");
    this.version = version;
};

Pong.prototype.setDate = function(date) {
    assert(date instanceof Date, "Date is expected");
    this.date = date;
};

Pong.prototype.setInfo = function(text) {
    assert(_.isString(text), "String is expected");
    this.info = text;
};

exports.Pong = Pong;