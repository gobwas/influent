var assert = require("assert");

exports.noop = function(){};

exports.getTypeOf = (function() {
    var typeReg = /\[object ([A-Z][a-z]+)\]/;

    return function(obj) {
        return Object.prototype.toString.call(obj).replace(typeReg, "$1");
    }
})();

exports.forEachIn = function(obj, iterator) {
    if (obj == null || typeof obj != "object") {
        return;
    }

    Object.keys(obj).forEach(function(key) {
        iterator.call(null, obj[key], key, obj);
    });
};

exports.extend = function(target) {
    [].slice.call(arguments).forEach(function(obj) {
        exports.forEachIn(obj, function(value, prop) {
            target[prop] = value;
        });
    });

    return target;
};

exports.values = function(source) {
    var values = [];

    exports.forEachIn(source, function(value) {
        values.push(value);
    });

    return values;
};

exports.pick = function(source, keys) {
    var needles, result;

    if (exports.isArray(keys)) {
        needles = keys;
    } else {
        needles = Array.prototype.slice.call(arguments, 1);
    }

    result = {};
    exports.forEachIn(source, function(value, key) {
        if (needles.indexOf(key) != -1) {
            result[key] = value;
        }
    });

    return result;
};

exports.isMatch = function(obj, criteria) {
    var i, key, keys, len;

    keys = Object.keys(criteria);
    len = keys.length;

    for (i = 0; i < len; i++) {
        key = keys[i];
        if (obj[key] !== criteria[key]) {
            return false;
        }
    }

    return true;
};

exports.findWhere = function(collection, criteria) {
    var i, len, item, matcher;

    if (_.isFunction(criteria)) {
        matcher = criteria;
    } else {
        matcher = function(item) {
            return exports.isMatch(item, criteria);
        };
    }

    len = collection.length;
    for (i = 0; i < len; i++) {
        item = collection[i];
        if (matcher.call(null, item)) {
            return item;
        }
    }

    return null;
};

["Object", "String", "Number", "Boolean", "Array", "Undefined"].forEach(function(type) {
    exports["is" + type] = function(obj) {
        return exports.getTypeOf(obj) == type;
    };
});

exports.isNumericString = (function() {
    var reg = /^\d*$/;
    return function(obj) {
        return exports.isString(obj) && reg.test(obj);
    }
})();

exports.flatten = function(list) {
    return list.reduce(function(result, item) {
        return result.concat(exports.isArray(item) ? exports.flatten(item) : item);
    }, []);
};

exports.chunks = function(source, size) {
    var i, index, chunks, chunk;

    assert(exports.isArray(source), "Array is expected to be a source");
    assert(exports.isNumber(size), "Number is expected to be a size");
    assert(size > 0, "Size must be a positive number");

    i = 0;
    chunks = [];
    while (true) {
        index = i * size;
        chunk = source.slice(index, index + size);

        if (chunk.length == 0) {
            break;
        }

        chunks.push(chunk);
        i++;
    }

    return chunks;
};

exports.any = function(promises) {
    return new Promise(function(resolve, reject) {
        var fulfilled, rejected, total;

        total = promises.length;
        fulfilled = false;
        rejected = 0;

        promises.forEach(function(promise) {
            promise
                .then(function(value) {
                    if (!fulfilled) {
                        fulfilled = true;
                        resolve(value);
                    }
                })
                .catch(function(err) {
                    if (!fulfilled && ++rejected == total) {
                        reject(err);
                    }
                });
        });
    });
};

