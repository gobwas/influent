var assert = require("assert");
var _ = require("../utils");

function Info() {
    this.version = null;
    this.date = null;
}

Info.prototype.setVersion = function(version) {
    assert(_.isString(version), "String is expected");
    this.version = version;
};

Info.prototype.setDate = function(date) {
    assert(date instanceof Date, "Date is expected");
    this.date = date;
};

exports.Info = Info;