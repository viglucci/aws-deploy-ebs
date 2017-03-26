var gulp     = require("gulp");
var zip      = require("gulp-zip");
var rename   = require("gulp-rename");
var conca    = require("gulp-concat");
var mustache = require("mustache");
var run      = require("run-sequence");
var del      = require("del");
var path     = require("path");
var fsp      = require("fs-promise");
var cp       = require("child_process");

var eb           = path.resolve("./.elasticbeanstalk");
var ebExtensions = path.resolve("./.ebextensions");

gulp.task("deploy", function (done) {    
    run("deploy:package",
        "deploy:deploy",
        done);
});

gulp.task("deploy:package", function (done) {    
    run("clean:package",
        "deploy:package:copy",
        "deploy:package:dockerrun",
        "deploy:package:archive",
        done);
});
 
gulp.task("deploy:package:copy", function (done) {
    run("deploy:package:copy:dockerrun", "deploy:package:copy:ebextensions", done);
});

gulp.task("deploy:package:copy:dockerrun", function (done) {
    return gulp.src([
        path.join(eb, "Dockerrun.aws.json"),
    ])
    .pipe(gulp.dest(path.join(eb, "artifact")));
});

gulp.task("deploy:package:copy:ebextensions", function (done) {
    return gulp.src([
        path.join(ebExtensions, "**")
    ])
    .pipe(gulp.dest(path.join(eb, "artifact", ".ebextensions")));
});

gulp.task("deploy:package:dockerrun", function () {
    var manifest = require(path.resolve("./.aws/build-manifest.json")); // generated by docker gulp tasks
    var dockerrun = path.resolve("./.elasticbeanstalk/artifact/Dockerrun.aws.json");
    return fsp.readFile(dockerrun, { encoding: "utf8" })
    .then(function (contents) {
        return mustache.render(contents, { image_name: manifest.tags.sha });
    })
    .then(function (contents) {
        return fsp.writeFile(dockerrun, contents);
    });
})

gulp.task("deploy:package:archive", function () {
    return gulp.src([
        path.join(eb, "artifact", "Dockerrun.aws.json"),
        path.join(eb, "artifact", ".ebextensions", "**"),
    ], { base: path.join(eb, "artifact") })
    .pipe(zip("artifact.zip"))
    .pipe(gulp.dest(path.join(eb, "artifact")));
});

gulp.task("deploy:deploy", function (done) {

    var proc = cp.spawn("eb", ["deploy", "viglucci-io-1"], { cwd: process.cwd(), stdio: [process.stdin, process.stdout, process.stderr] });

    proc.on("error", function (data) {
        console.log(data.toString());
    });

    proc.on("close", function (code) {
        console.log("Child closed with code " + code);
        done();
    });
});
