var gulp = require("gulp");
var inherits = require("inherits-js");
var stream = require("stream");

gulp.task('test', function (done) {
    var istanbul = require("gulp-istanbul");
    var mocha = require("gulp-mocha");
    var jscs = require("gulp-jscs");

    gulp.src(['./lib/**/*.js'])
        .pipe(jscs())
        .pipe(jscs.reporter())
        .pipe(jscs.reporter('fail'))
        .pipe(istanbul())
        .pipe(istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(['test/unit/**/*.js'])
                .pipe(mocha())
                .pipe(istanbul.writeReports())
                // todo uncomment this while all tests are done
                //.pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }))
                .on('end', done);
        });
});

gulp.task("coveralls", function() {
    var coveralls = require('gulp-coveralls');

    return gulp.src('./coverage/lcov.info')
        .pipe(coveralls());
});

gulp.task("ci", function(done) {
    var runSequence = require("run-sequence");

    runSequence(
        "test",
        "karma:ci",
        done
    );
});

gulp.task("webtest", ["browser"], function() {
    var glob = require("glob");
    var Browserify = require("browserify");
    var source = require("vinyl-source-stream");
    var buffer = require("vinyl-buffer");
    var replace = require("gulp-replace");
    var polyfiller = require("gulp-autopolyfiller");
    var fs = require("fs");
    var nunjucksify = require("./build/transform/nunjucks").factory;

    return Promise.all([
        new Promise(function(resolve, reject) {
            glob("./test/+(unit|system)/**/*.js", function(err, files) {
                if (err) {
                    reject(err);
                    return
                }

                resolve(files);
            });
        }),
        new Promise(function(resolve, reject) {
            var indexStubPath = "/tmp/influent.js";

            // stick to window.influent
            fs.writeFile(indexStubPath, new Buffer("module.exports = influent;"), function(err) {
                if (err) {
                    return reject(err);
                }

                resolve(indexStubPath);
            });
        })
    ])
    .then(function(list) {
        var files = list[0];
        var stub = list[1];
        var bundler = new Browserify();

        // use conditional builds templating
        bundler.transform(nunjucksify, {
            data: {
                BUILD_TARGET: "browser"
            }
        });

        bundler.require(stub, { expose: "../../index.js" });

        files.forEach(function(file) {
            bundler.add(file);
        });

        return new Promise(function(resolve, reject) {
            bundler.bundle()
                .pipe(source("bundle.js"))
                .pipe(buffer())
                .pipe(replace(/\.(catch|export)\b/gi, "['$1']"))
                .pipe(gulp.dest("./test/web"))
                .pipe(polyfiller('polyfills.js'))
                .pipe(gulp.dest("./test/web"))
                .on('error', reject)
                .on('finish', resolve);
        });
    })
});

function karma(name, cb) {
    var Server = require('karma').Server;

    karma = new Server({configFile: name}, cb);
    karma.start();
}

gulp.task("karma:local", ["webtest"], function(done) {
    karma(__dirname + '/.karma.local.js', done)
});

gulp.task("karma:ci", ["webtest"], function(done) {
    karma(__dirname + '/.karma.ci.js', done)
});

gulp.task("browser", function() {
    var source = require("vinyl-source-stream");
    var buffer = require("vinyl-buffer");
    var Browserify = require("browserify");
    var replace = require("gulp-replace");
    var rename = require("gulp-rename");
    var uglify = require("gulp-uglify");
    var literalify = require("literalify");
    var umd = require("gulp-umd");
    var zopfli = require("gulp-zopfli");
    var path = require("path");
    var nunjucksify = require("./build/transform/nunjucks").factory;
    var bundler;

    bundler = new Browserify({
        builtins: [
            "_process"
        ]
    });

    // use conditional builds templating
    bundler.transform(nunjucksify, {
        data: {
            BUILD_TARGET: "browser"
        }
    });

    bundler.require("./index.js", { expose: "influent" });
    bundler.require("./node_modules/assert/assert.js", { expose: "assert" });
    bundler.require("./node_modules/events/events.js", { expose: "events" });
    bundler.require("./node_modules/querystring/index.js", { expose: "querystring" });

    bundler.bundle()
        .pipe(source("influent.js"))
        .pipe(buffer())
        .pipe(replace(/\.(catch|export)\b/gi, "['$1']"))
        .pipe(umd({
            exports: function(file) {
                return 'require("influent")';
            },
            namespace: function(file) {
                return 'influent';
            },
            dependencies: function(file) {
                return [];
            },
            template: path.join(__dirname, 'build/returnExports.ejs')
        }))
        .pipe(gulp.dest("./dist"))
        .pipe(uglify())
        .pipe(rename({ extname: ".min.js" }))
        .pipe(gulp.dest("./dist"))
        .pipe(zopfli({ format: "gzip" }))
        .pipe(rename({ extname: ".gz" }))
        .pipe(gulp.dest("./dist"));

});