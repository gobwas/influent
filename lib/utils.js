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