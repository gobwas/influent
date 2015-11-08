var inherits = require("inherits-js");
var _ = require("lodash");
var assert = require("assert");
var stream = require("stream");

var Transform = inherits(stream.Transform,
	/**
	 * @lends Transform.prototype
	 */
	{
		constructor: function(file, options) {
			stream.Transform.call(this);
			this.file = file;
	    	this.options = _.extend({}, this.constructor.DEFAULTS, options);
		},

		_transform: function(chunk, enc, done) {
			throw new TypeError("method '_transform' should be implemented");
		},

		_flush: function(done) {
			throw new TypeError("method '_flush' should be implemented");
		}
	},

	{
		DEFAULTS: {}
	}
);

Transform.extend = function(p, s) {
    return inherits(this, p, s);
};

function factory(file, options) {
	return new Transform(file, options);
};

exports.Transform = Transform;
exports.factory = factory;
