var gulp = require("gulp");

gulp.task("browser", function() {
    var source = require("vinyl-source-stream");
    var buffer = require("vinyl-buffer");
    var Browserify = require("browserify");
    var bReplace = require("browserify-replace");
    var replace = require("gulp-replace");
    var rename = require("gulp-rename");
    var uglify = require("gulp-uglify");
    var literalify = require("literalify");
    var umd = require("gulp-umd");
    var path = require("path");
    var bundler;

    bundler = new Browserify({
        builtins: [
            "_process"
        ]
    });

    bundler.require("./index.js", { expose: "influent" });
    bundler.require("./node_modules/assert/assert.js", { expose: "assert" });
    bundler.require("./node_modules/events/events.js", { expose: "events" });
    bundler.require("./node_modules/querystring/index.js", { expose: "querystring" });

    bundler.transform(bReplace, { replace: [
        {
            from: /require\("hurl\/lib\/node"\)\.NodeHttp/g,
            to: 'require("hurl/lib/xhr").XhrHttp'
        }
    ]});

    //bundler.transform(literalify.configure({
    //    "jquery": "_$"
    //}));

    bundler.bundle()
        .pipe(source("influent.js"))
        .pipe(buffer())
        .pipe(replace(/\.catch\b/gi, "['catch']"))
        .pipe(replace(/\.export\b/gi, "['export']"))
        .pipe(umd({
            exports: function(file) {
                return 'require("influent")';
            },
            namespace: function(file) {
                return 'influent';
            },
            dependencies: function(file) {
                return [
                    //{
                    //    name: '_$',
                    //    amd: 'jquery',
                    //    cjs: 'jquery',
                    //    global: 'jQuery'
                    //}
                ];
            },
            template: path.join(__dirname, 'build/returnExports.ejs')
        }))
        .pipe(gulp.dest("./dist"))
        .pipe(uglify())
        .pipe(rename({ extname: ".min.js" }))
        .pipe(gulp.dest("./dist"));
});