var inherits = require("inherits-js");
var _ = require("../../utils");
var assert = require("assert");

/**
 * @abstract
 */
function Elector () {
	this.options = _.extend({}, this.constructor.DEFAULTS, options);
	this.lastHealthCheck = -1;
	this.activeHost = null;
}

Elector.prototype = {
	constructor: Elector,

	/**
	 * @abstract
	 */
	getHost: function(hosts) {
		throw new TypeError("Method 'getHost' should be implemented");	
	}
}

Elector.DEFAULTS = {
	period: 0
};

Elector.extend = function(p, s) {
	return inherits(this, p, s);
};

exports.Elector = Elector;