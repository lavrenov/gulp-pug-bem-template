"use strict";

const gulp = require("gulp");
const pug = require("gulp-pug");
const browserSync = require("browser-sync");
const yargs = require("yargs");
const gulpIf = require("gulp-if");
const replace = require("gulp-replace");
const del = require("del");
const favicons = require("gulp-favicons");
const debug = require("gulp-debug");
const imagemin = require("gulp-imagemin");
const imageminPngquant = require("imagemin-pngquant");
const imageminZopFli = require("imagemin-zopfli");
const imageminMozJpeg = require("imagemin-mozjpeg");
const imageminGifLossy = require("imagemin-giflossy");
const newer = require("gulp-newer");
const svg = require("gulp-svg-sprite");
const rename = require("gulp-rename");
const sass = require("gulp-sass");
const minCss = require("gulp-clean-css");
const groupMedia = require("gulp-group-css-media-queries");
const autoprefixer = require("gulp-autoprefixer");
const sourcemaps = require("gulp-sourcemaps");
const plumber = require("gulp-plumber");
const imageminWebp = require("imagemin-webp");
const webp = require("gulp-webp");
const rigger = require("gulp-rigger");
const uglify = require("gulp-uglify");
const ftp = require("vinyl-ftp");

const path = {
    views: {
        src: [
            "./src/views/index.pug",
            "./src/views/pages/*.pug"
        ],
        dist: "./dist/",
        watch: [
            "./src/blocks/**/*.pug",
            "./src/views/**/*.pug"
        ]
    },
    styles: {
        src: "./src/styles/main.{scss,sass}",
        dist: "./dist/styles/",
        watch: [
            "./src/blocks/**/*.{scss,sass}",
            "./src/styles/**/*.{scss,sass}"
        ]
    },
    scripts: {
        src: "./src/js/main.js",
        dist: "./dist/js/",
        watch: [
            "./src/blocks/**/*.js",
            "./src/js/**/*.js"
        ]
    },
    images: {
        src: [
            "./src/img/**/*.{jpg,jpeg,png,gif,tiff,svg}",
            "!./src/img/favicon/*.{jpg,jpeg,png,gif,tiff}"
        ],
        dist: "./dist/img/",
        watch: "./src/img/**/*.{jpg,jpeg,png,gif,svg}"
    },
    sprites: {
        src: "./src/img/svg/*.svg",
        dist: "./dist/img/sprites/",
        watch: "./src/img/svg/*.svg"
    },
    fonts: {
        src: "./src/fonts/**/*.{woff,woff2}",
        dist: "./dist/fonts/",
        watch: "./src/fonts/**/*.{woff,woff2}"
    },
    favicons: {
        src: "./src/img/favicon/*.{jpg,jpeg,png,gif,tiff}",
        dist: "./dist/img/favicons/",
    },
    deploy: require("./config"),
    clean: "./dist/*"
};

const argv = yargs.argv;
const production = !!argv.production;

gulp.task("views", () => {
    return gulp.src(path.views.src)
        .pipe(pug({
            pretty: true
        }))
        .pipe(gulpIf(production, replace(".css", ".min.css")))
        .pipe(gulpIf(production, replace(".js", ".min.js")))
        .pipe(gulp.dest(path.views.dist))
        .pipe(browserSync.stream());
});

gulp.task("styles", () => {
    return gulp.src(path.styles.src)
        .pipe(gulpIf(!production, sourcemaps.init()))
        .pipe(plumber())
        .pipe(sass())
        .pipe(groupMedia())
        .pipe(gulpIf(production, autoprefixer({
            cascade: false,
            grid: true
        })))
        .pipe(gulpIf(production, minCss({
            compatibility: "ie8", level: {
                1: {
                    specialComments: 0,
                    removeEmpty: true,
                    removeWhitespace: true
                },
                2: {
                    mergeMedia: true,
                    removeEmpty: true,
                    removeDuplicateFontRules: true,
                    removeDuplicateMediaBlocks: true,
                    removeDuplicateRules: true,
                    removeUnusedAtRules: false
                }
            }
        })))
        .pipe(gulpIf(production, rename({
            suffix: ".min"
        })))
        .pipe(plumber.stop())
        .pipe(gulpIf(!production, sourcemaps.write("./maps/")))
        .pipe(gulp.dest(path.styles.dist))
        .pipe(debug({
            "title": "CSS files"
        }))
        .on("end", browserSync.reload);
});

gulp.task("scripts", () => {
    return gulp.src(path.scripts.src)
        .pipe(rigger())
        .pipe(gulpIf(production, uglify()))
        .pipe(gulpIf(production, rename({
            suffix: ".min"
        })))
        .pipe(gulp.dest(path.scripts.dist))
        .pipe(debug({
            "title": "JS files"
        }))
        .pipe(browserSync.stream());
});

gulp.task("images", () => {
    return gulp.src(path.images.src)
        .pipe(newer(path.images.dist))
        .pipe(gulpIf(production, imagemin([
            imageminGifLossy({
                optimizationLevel: 3,
                optimize: 3,
                lossy: 2
            }),
            imageminPngquant({
                speed: 5,
                quality: [0.6, 0.8]
            }),
            imageminZopFli({
                more: true
            }),
            imageminMozJpeg({
                progressive: true,
                quality: 90
            }),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: false},
                    {removeUnusedNS: false},
                    {removeUselessStrokeAndFill: false},
                    {cleanupIDs: false},
                    {removeComments: true},
                    {removeEmptyAttrs: true},
                    {removeEmptyText: true},
                    {collapseGroups: true}
                ]
            })
        ])))
        .pipe(gulp.dest(path.images.dist))
        .pipe(debug({
            "title": "Images"
        }))
        .pipe(browserSync.stream());
});

gulp.task("webp", () => {
    return gulp.src(path.images.src)
        .pipe(newer(path.images.dist))
        .pipe(webp(gulpIf(production, imageminWebp({
            lossless: true,
            quality: 100,
            alphaQuality: 100
        }))))
        .pipe(gulp.dest(path.images.dist))
        .pipe(debug({
            "title": "Images"
        }))
        .on("end", browserSync.reload);
});

gulp.task("sprites", () => {
    return gulp.src(path.sprites.src)
        .pipe(svg({
            shape: {
                dest: "intermediate-svg"
            },
            mode: {
                stack: {
                    sprite: "../sprite.svg"
                }
            }
        }))
        .pipe(gulp.dest(path.sprites.dist))
        .pipe(debug({
            "title": "Sprites"
        }))
        .on("end", browserSync.reload);
});

gulp.task("fonts", () => {
    return gulp.src(path.fonts.src)
        .pipe(gulp.dest(path.fonts.dist))
        .pipe(debug({
            "title": "Fonts"
        }));
});

gulp.task("favicons", () => {
    return gulp.src(path.favicons.src)
        .pipe(favicons({
            icons: {
                appleIcon: true,
                favicons: true,
                online: false,
                appleStartup: false,
                android: false,
                firefox: false,
                yandex: false,
                windows: false,
                coast: false
            }
        }))
        .pipe(gulp.dest(path.favicons.dist))
        .pipe(debug({
            "title": "Favicons"
        }));
});

gulp.task("icons", () => {
    return gulp.src("node_modules/@fortawesome/fontawesome-free/webfonts/*")
        .pipe(gulp.dest(path.fonts.dist));
});

gulp.task("clean", () => {
    return del([path.clean]);
});

gulp.task("serve", () => {
    browserSync.init({
        server: path.views.dist,
        notify: false
    });

    gulp.watch(path.views.watch, gulp.parallel("views"));
    gulp.watch(path.styles.watch, gulp.parallel("styles"));
    gulp.watch(path.scripts.watch, gulp.parallel("scripts"));
    gulp.watch(path.sprites.watch, gulp.parallel("sprites"));
    gulp.watch(path.images.watch, gulp.parallel("images"));
    gulp.watch(path.fonts.watch, gulp.parallel("fonts"));
});

gulp.task("upload", () => {
    const connect = ftp.create({
        host: path.deploy.host,
        user: path.deploy.user,
        password: path.deploy.password,
        parallel: 10,
    });
    return gulp.src(path.deploy.src, {buffer: false})
        .pipe(connect.dest(path.deploy.destination))
        .pipe(debug({
            "title": "Upload"
        }));
});

gulp.task("development",
    gulp.series("clean",
        gulp.parallel(["views", "styles", "scripts", "images", "webp", "sprites", "fonts", "favicons", "icons"]),
        gulp.parallel("serve"))
);

gulp.task("prod",
    gulp.series("clean",
        gulp.parallel(["views", "styles", "scripts", "images", "webp", "sprites", "fonts", "favicons", "icons"]))
);

gulp.task("deploy",
    gulp.series("prod", "upload")
);

gulp.task("default", gulp.series("development"));
