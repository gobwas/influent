var gulp = require("gulp");

gulp.task('test', function (done) {
    var istanbul = require("gulp-istanbul");
    var mocha = require("gulp-mocha");

    gulp.src(['./lib/**/*.js'])
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
        "webtest",
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
    var File = require("vinyl");
    var polyfiller = require("gulp-autopolyfiller");

    return new Promise(function(resolve, reject) {
        glob("./test/+(unit|system)/**/*.js", function(err, files) {
            if (err) {
                reject(err);
                return
            }

            resolve(files);
        });
    })
    .then(function(files) {
        var bundler = new Browserify();

        file = new File({
            // lay on window.influent
            contents: new Buffer("module.exports = influent;")
        });
        bundler.require(file, { expose: "../../index.js" });

        files.forEach(function(file) {
            console.log('test >>', file);
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

gulp.task("karma:local", function(done) {
    karma(__dirname + '/.karma.local.js', done)
});

gulp.task("karma:ci", function(done) {
    karma(__dirname + '/.karma.ci.js', done)
});

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
        .pipe(replace(/\.(catch|export)\b/gi, "['$1']"))
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