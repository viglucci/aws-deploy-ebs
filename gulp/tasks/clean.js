var gulp = require("gulp");
var del  = require("del");
var path = require("path");
var run  = require("run-sequence");

gulp.task("clean", function (done) {
    run(["clean:package", "clean:manifest"], done);
});

gulp.task("clean:package", function () {
    var eb = path.resolve("./.aws/.elasticbeanstalk/");
    var patterns = [
        path.join(eb, "artifact", "**", "*"),
        path.join(eb, "artifact", ".ebextensions"),
        path.join("!" + eb, "artifact", ".gitkeep"),
    ];
    return del(patterns);
});

gulp.task("clean:manifest", function () {
    return del([path.resolve("./.aws/build-manifest.json")])
});
