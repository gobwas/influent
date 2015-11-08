var Transform = require("./transform").Transform;
var assert = require("assert");
var _ = require("lodash");
var nunjucks = require("nunjucks");

var env = nunjucks.configure({
    tags: {
        blockStart: '//[',
        blockEnd: ']',
        variableStart: '//[$',
        variableEnd: '$]',
        commentStart: '//[#',
        commentEnd: '#]'
      }
});

env.addExtension('js', new JsExtension());

function JsExtension() {
    this.tags = ['js'];

    this.parse = function(parser, nodes, lexer) {
        // get the tag token
        var tok = parser.nextToken();

        // parse the args and move after the block end. passing true
        // as the second arg is required if there are no parentheses
        var args = parser.parseSignature(null, true);
        parser.advanceAfterBlockEnd(tok.value);

        // parse the body
        var body = parser.parseUntilBlocks('endjs');
        parser.advanceAfterBlockEnd();

        // See above for notes about CallExtension
        return new nodes.CallExtension(this, 'run', args, [body]);
    };

    this.run = function(context, body) {
        var str = body();

        return str.split("\n")
            .map(function(str) {
                return str
                    // .replace(/^\s*$/, "")
                    .replace(/^(\s*)\/\/\s(\s*)(.*)$/ig, "$1$2$3")
                    .replace(/^(\s*)\/\/\/\s?(\s*)(.*)$/ig, "$1$2\/\/$3")
            })
            // .filter(function(str) {
            //  return str.length > 0;
            // })
            .join("\n");
    };
}

/**
 * @class NunjucksTransform
 * @extends Transform
 */
var NunjucksTransform = Transform.extend(
    /**
     * @lends NunjucksTransform.prototype
     */
    {
        constructor: function(file, options) {
            Transform.prototype.constructor.apply(this, arguments);
            this.buffer = new Buffer("");
        },

        _transform: function(chunk, enc, done) {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            done();
        },

        _flush: function(done) {
            this.push(new Buffer(env.renderString(this.buffer.toString(), this.options.data)));
            done();
        }
    }
);


function factory(file, options) {
    return new NunjucksTransform(file, options);
};

exports.NunjucksTransform = NunjucksTransform;
exports.factory = factory;
