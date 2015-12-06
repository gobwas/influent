var _ = require("./utils");
var assert = require("assert");
var inherits = require("inherits-js");

/**
 * @class Value
 * @constructor
 * @abstract
 *
 * @param {string|number|boolean} data
 */
function Type(data) {
    if (!(this instanceof Type)) {
        throw new TypeError("Could not use type constructor without 'new' keyword");
    }

    this.data = data;
}

Type.extend = function(p, s) {
    return inherits(this, p, s);
};

/**
 * @class Str
 * @extends Type
 */
var Str = Type.extend({
    constructor: function(s) {
        assert(_.isString(s), "String is expected");
        Type.prototype.constructor.call(this, s);
    }
});

/**
 * @class F64
 * @extends Type
 */
var F64 = Type.extend({
    constructor: function(f) {
        assert(_.isNumber(f), "Number is expected");
        Type.prototype.constructor.call(this, f);
    }
});

/**
 * @class I64
 * @extends Type
 */
var I64 = Type.extend({
    constructor: function(i) {
        assert(_.isNumber(i), "Number is expected");
        Type.prototype.constructor.call(this, i);
    }
});

/**
 * @class Bool
 * @extends Type
 */
var Bool = Type.extend({
    constructor: function(b) {
        assert(_.isBoolean(b), "Boolean is expected");
        Type.prototype.constructor.call(this, b);
    }
});

function cast(obj) {
    var type = _.getTypeOf(obj);

    switch (type) {
        case "String": {
            return new Str(obj);
        }

        case "Number": {
            return new F64(obj);
        }

        case "Boolean": {
            return new Bool(obj);
        }

        default: {
            throw new TypeError("Could not map to the influx type: got '" + type + "'");
        }
    }
}

exports.cast = cast;
exports.Type = Type;
exports.Str = Str;
exports.F64 = F64;
exports.I64 = I64;
exports.Bool = Bool;
