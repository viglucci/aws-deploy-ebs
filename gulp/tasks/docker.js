var gulp     = require("gulp");
var zip      = require("gulp-zip");
var rename   = require("gulp-rename");
var run      = require("run-sequence");
var del      = require("del");
var path     = require("path");
var cp       = require("child_process");
var cpp      = require("child-process-promise");
var mustache = require("mustache");
var fsp      = require("fs-promise");
var env      = require("node-env-file");

env(path.resolve("./.aws/env/.env"));

var log = console.log.bind(console);

var MANIFEST_PATH   = path.resolve("./.aws/build-manifest.json");
var DOCKER_REGISTRY = process.env.DOCKER_REGISTRY;
var SHA             = null;
var TAGS_SHA        = null;
var TAGS_LATEST     = `${DOCKER_REGISTRY}/viglucci.io:latest`;

gulp.task("docker", function (done) {
    run("clean:manifest",
        "docker:build",
        "docker:build:manifest",
        "docker:publish",
        done);
});

gulp.task("docker:build", function (done) {
    GIT.getSha()
    .then(function (sha) {
        SHA      = sha;
        TAGS_SHA = `${DOCKER_REGISTRY}/viglucci.io:${SHA}`;
    })
    .then(function () {

        var cmd = "docker";
        var args = [
            "build",
            "-t",  TAGS_SHA,
            "-t",  TAGS_LATEST,
            "-f", "./Dockerfile",
            "."
        ];
        
        log([">", cmd, args.join(" ")].join(" "));
        
        var proc = cp.spawn(cmd, args, {
            cwd: process.cwd(),
            stdio: [process.stdin, process.stdout, process.stderr]
        });

        proc.on("error", function (e) {
            console.error(e.toString());
            done(e);
        });

        proc.on("close", function (code) {
            done(code);
        });
    })
    .catch(done);
});

gulp.task("docker:build:manifest", function () {
    var manifest = {
        tags: {
            sha: TAGS_SHA,
            latest: TAGS_LATEST
        }
    };
    var str_manifest = JSON.stringify(manifest, null, 2);
    return fsp.writeFile(MANIFEST_PATH, str_manifest)
    .then(function(contents) {
        console.log("Generated build manifest:");
        console.log(str_manifest);
    });
});

gulp.task("docker:publish", function (done) {

    var manifest = null;

    fsp.readFile(MANIFEST_PATH)
    .then(function(contents) {
        manifest = JSON.parse(contents);
    })
    .then(function () {
        return AWS.getLogin()
        .then(function (login) {
            return AWS.login((/^win/.test(process.platform)) ? login.replace("https://", "") : login);
        });
    })
    .then(function () {
        var cmd = "docker";
        var args = [
            "push",
            manifest.tags.sha
        ];

        log([">", cmd, args.join(" ")].join(" "));

        var proc = cp.spawn(cmd, args, {
            cwd: process.cwd(),
            stdio: [process.stdin, process.stdout, process.stderr]
        });

        proc.on("error", function (e) {
            console.error(e.toString());
            done(e);
        });

        proc.on("close", function (code) {
            done(code);
        });
    })
    .catch(done);

});

var GIT = {
    getSha: function () {
        var cmd = "git rev-parse --short HEAD"
        log([">", cmd].join(" "));
        return cpp.exec(cmd)
        .then(function (data) {
            return data.stdout.trim();
        });
    }
};

var AWS = {
    getLogin: function () {
        var cmd = "aws ecr get-login"
        log([">", cmd].join(" "));
        return cpp.exec(cmd)
        .then(function (data) {
            return data.stdout.trim();
        });
    },
    login: function (cmd) {
        log([">", cmd].join(" "));
        return cpp.exec(cmd)
        .then(function (data) {
            return data.stdout.trim();
        });
    }
};
