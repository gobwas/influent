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

["Object", "String", "Number", "Boolean", "Array"].forEach(function(type) {
    exports["is" + type] = function(obj) {
        return exports.getTypeOf(obj) == type;
    };
});

exports.flatten = function(list) {
    return list.reduce(function(result, item) {
        return result.concat(exports.isArray(item) ? exports.flatten(item) : item);
    }, []);
};