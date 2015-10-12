var Serializer      = require("./serializer").Serializer;
var Measurement = require("../measurement").Measurement;
var STRING      = require("../type").STRING;
var BOOLEAN     = require("../type").BOOLEAN;
var INT64       = require("../type").INT64;
var FLOAT64     = require("../type").FLOAT64;
var assert      = require("assert");
var _           = require("../utils");

var LineSerializer, escape, asString, asBoolean, asFloat, asInteger;

escape = (function() {
    var spaceReg = / /g;
    var commaReg = /,/g;

    return function(str) {
        assert(_.isString(str), "String is expected");

        return str
            .replace(spaceReg, "\\ ")
            .replace(commaReg, "\\,");
    }
})();

asString = (function() {
    var quotesReg = /"/g;

    return function(str) {
        var result;

        assert(_.isString(str), "String is expected");

        result = str.replace(quotesReg, '\\"');

        return '"' + result + '"';
    }
})();

asBoolean = function(obj) {
    assert(_.isBoolean(obj), "Boolean is expected");

    return obj ? "t" : "f";
};

asInteger = function(obj) {
    var str;

    assert(_.isNumber(obj), "Number is expected");

    str = obj.toString();

    assert((str.indexOf(".") == -1), "Converting to integer, but float given");

    return str + "i";
};

asFloat = function(obj) {
    assert(_.isNumber(obj), "Number is expected");

    return obj.toString();
};


function sortAndEach(obj, iterator) {
    // as spec says, sort should be compatible with Go's func Compare
    // Compare returns an integer comparing two byte slices lexicographically.
    // The result will be 0 if a==b, -1 if a < b, and +1 if a > b. A nil argument is equivalent to an empty slice.
    // @see http://golang.org/pkg/bytes/#Compare
    Object
        .keys(obj)
        .sort(function(a, b) {
            if (a < b) {
                return -1;
            }

            if (a > b) {
                return 1;
            }

            return 0;
        })
        .forEach(function(prop) {
            iterator.call(null, obj[prop], prop, obj);
        });
}


/**
 * @class LineSerializer
 * @extends Serializer
 */
LineSerializer = Serializer.extend(
    /**
     * @lends LineSerializer.prototype
     */
    {
        serialize: function(measurement) {
            assert(measurement instanceof Measurement, "Measurement is expected");

            return new Promise(function(resolve) {
                var line, timestamp;

                line = escape(measurement.key);

                sortAndEach(measurement.tags, function(value, tag) {
                    line+= "," + escape(tag) + "=" + escape(value);
                });

                sortAndEach(measurement.fields, (function() {
                    var touchedFields, glue;

                    return function(value, field) {
                        var strValue;

                        if (!touchedFields) {
                            glue = " ";
                            touchedFields = true;
                        } else {
                            glue = ",";
                        }

                        switch (value.type) {
                            case STRING: {
                                strValue = asString(value.data);
                                break;
                            }
                            case BOOLEAN: {
                                strValue = asBoolean(value.data);
                                break;
                            }
                            case INT64: {
                                strValue = asInteger(value.data);
                                break;
                            }
                            case FLOAT64: {
                                strValue = asFloat(value.data);
                                break;
                            }

                            default: {
                                return Promise.reject(new TypeError("Unable to determine action for value type"));
                            }
                        }

                        line+= glue + escape(field) + "=" + strValue;
                    }
                })());

                if (timestamp = measurement.timestamp) {
                    line+= " " + timestamp;
                }

                resolve(line);
            });
        }
    }
);

exports.LineSerializer = LineSerializer;