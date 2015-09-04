var _ = require("./utils");

var STRING  = 0;
var FLOAT64 = 1;
var INT64   = 2;
var BOOLEAN = 3;

var TYPE = [ STRING, FLOAT64, INT64, BOOLEAN ];

//var MAP = {};
//MAP[STRING]  = "string";
//MAP[FLOAT64] = "float64";
//MAP[INT64]   = "int64";
//MAP[BOOLEAN] = "boolean";

exports.getInfluxTypeOf = function(obj) {
    var type = _.getTypeOf(obj);

    switch (type) {
        case "String": {
            return STRING;
        }

        case "Number": {
            return FLOAT64;
        }

        case "Boolean": {
            return BOOLEAN;
        }

        default: {
            throw new TypeError("Could not map to the influx type: got '" + type + "'");
        }
    }
};

exports.STRING = STRING;
exports.FLOAT64 = FLOAT64;
exports.INT64 = INT64;
exports.BOOLEAN = BOOLEAN;
exports.TYPE = TYPE;