var gulp        = require("gulp");
var dir         = require("require-dir");

dir("./gulp/tasks", { recurse: true });

gulp.task("default", ["clean", "docker", "deploy"]);
