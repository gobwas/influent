var Ping = require("./ping").Ping;
var Host = require("../../host").Host;
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
	 	ping: function(host) {
	 		assert(host instanceof Host, "Host is expected");
	 		
	 		return new Promise(function(resolve, reject) {
	 			var command = "ping -c" + this.options.count + " -t" + this.options.timeout + " " + host.host;
	 			
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