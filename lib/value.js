var TYPE   = require("./type").TYPE;
var getInfluxTypeOf = require("./type").getInfluxTypeOf;
var assert = require("assert");

/**
 * @class Value
 * @constructor
 * @final
 *
 * @param {string|number|boolean} data
 * @param {number} [type]
 */
function Value(data, type) {
    if (type != void 0) {
        assert(TYPE.indexOf(type) != -1, "Type is unknown");
    } else {
        type = getInfluxTypeOf(data);
    }

    this.data = data;
    this.type = type;
}

exports.Value = Value;