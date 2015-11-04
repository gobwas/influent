var Ping = require("./ping").Ping;
var Host = require("../../host").Host;
var _ = require("../../../utils");
var assert = require("assert");
var cmd = require("child_process");

/**
 * @class CmdPing
 * @extends Ping
 */
CmdPing = Ping.extend(
	/**
	 * @lends CmdPing.prototype
	 */
	 {
	 	pong: function(host) {
	 		var self = this;

	 		assert(host instanceof Host, "Host is expected");
	 		
	 		return new Promise(function(resolve, reject) {
	 			var command = "ping -c" + self.options.count + " -t" + self.options.timeout + " " + host.host;
	 			
	 			cmd.exec(command, function(err) {
	 				if (err) {
	 					return reject(err);
	 				}

	 				resolve();
	 			});
	 		});
	 	}
	 },

	 {
	 	DEFAULTS: _.extend({}, Ping.DEFAULTS, {
	 		count:   1,
	 		timeout: 3
	 	})
	 }
);

exports.CmdPing = CmdPing;