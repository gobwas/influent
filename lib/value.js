var TYPE   = require("./type").TYPE;
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
    assert(TYPE.indexOf(type) != -1, "Type is unknown");

    this.data = data;
    this.type = type;
}

exports.Value = Value;
