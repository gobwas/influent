var inherits = require("inherits-js");

/**
 * @abstract
 */
function Serializer() {
    //
}

Serializer.prototype = {
    constructor: Serializer,

    /**
     * @abstract
     */
    serialize: function(measurement) {
        throw new TypeError("Method 'serialize' must be implemented");
    }
};

Serializer.extend = function(p, s) {
    return inherits(this, p, s);
};

exports.Serializer = Serializer;