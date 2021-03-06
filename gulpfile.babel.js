// generated using generator-gulp-webapp 1.0.3
import gulp from 'gulp';
import marked from 'marked';
import highlight from 'highlight.js';
import gulpLoadPlugins from 'gulp-load-plugins';
import browserSync from 'browser-sync';
import del from 'del';
import fs from 'fs';
import childProcess from 'child_process';

const $ = gulpLoadPlugins();
const reload = browserSync.reload;
const exec = childProcess.exec;

marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false,
  highlight: (code, lang) => {
    return highlight.highlightAuto(code, [lang]).value;
  }
});

function markdownFilter(code) {
  code = code
    .replace(/[\s\S]*(?=#+ Notable Features)/m, '')
    .replace(/#+ Copyright[\s\S]*/m, '');
  return marked(code);
}

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function banner() {
  var pkg = readJson('./package.json');
  var bower = readJson('./bower.json');
  return `
    /*!
     * ${bower.name}
     * version: ${pkg.version}
     * authors: ${bower.authors}
     * license: ${bower.license}
     * ${bower.homepage}
     */
  `.replace(/\n\s{0,4}/g, '\n').replace('\n', '');
}

function bump(type) {
  gulp.src('./package.json')
    .pipe($.bump({type: type}))
    .pipe(gulp.dest('./'))
    .pipe($.callback(() => { gulp.start('build:min'); }));
};

gulp.task('images', () => {
  return gulp.src('website/images/*')
    .pipe(gulp.dest('dist/website/images'))
});

gulp.task('styles', () => {
  return gulp.src([
      'src/styles/*.scss',
      'website/styles/*.scss'
    ])
    .pipe($.plumber())
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.util.log))
    .pipe($.autoprefixer({browsers: ['last 1 version']}))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(reload({stream: true}));
});

gulp.task('scripts', () => {
  return gulp.src([
      'src/scripts/*.coffee',
      'website/scripts/*.coffee'
    ])
    .pipe($.include()).on('error', $.util.log)
    .pipe($.plumber())
    .pipe($.coffee().on('error', $.util.log))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(reload({stream: true}));
});

gulp.task('html', ['styles', 'scripts'], () => {
  return gulp.src('website/*.html')
    .pipe($.fileInclude({
      prefix: '@@',
      basepath: '@file',
      filters: {
        markdown: markdownFilter
      }
    })).on('error', $.util.log)
    .pipe(gulp.dest('.tmp'))
    .pipe(reload({stream: true}));
});

gulp.task('clean', del.bind(null, ['.tmp', 'dist']));

gulp.task('serve', ['html', 'styles', 'scripts'], () => {
  browserSync({
    notify: false,
    port: 9000,
    ghostMode: {
      clicks: false,
      forms: false,
      scroll: false
    },
    server: {
      baseDir: ['.tmp', 'website'],
      routes: {
        '/bower_components': 'bower_components',
        '/docs': '.tmp/docs.html',
        '/examples': '.tmp/examples.html'
      }
    }
  });

  gulp.watch([
    'website/**/*.html',
    '**/*.md',
    'src/scripts/**/*.coffee',
    'src/templates/**/*.html',
    'website/scripts/**/*.coffee'
  ]).on('change', reload);

  gulp.watch('src/styles/**/*.scss', ['styles']);
  gulp.watch('website/styles/**/*.scss', ['styles']);
  gulp.watch('src/scripts/**/*.coffee', ['scripts']);
  gulp.watch('src/templates/**/*.html', ['scripts']);
  gulp.watch('website/scripts/**/*.coffee', ['scripts']);
  gulp.watch('website/**/*.html', ['html']);
  gulp.watch('**/*.md', ['html']);
});

gulp.task('build', ['scripts', 'styles'], () => {
  return gulp.src(['.tmp/scripts/daterangepicker.js', '.tmp/styles/daterangepicker.css'])
    .pipe($.header(banner()))
    .pipe(gulp.dest('dist/'))
    .pipe($.size({title: 'build', gzip: true}));
});

gulp.task('build:min', ['build'], () => {
  return gulp.src(['dist/daterangepicker.js', 'dist/daterangepicker.css'])
    .pipe($.if('*.js', $.uglify({preserveComments: 'license'})))
    .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
    .pipe($.if('*.js', $.extReplace('.min.js')))
    .pipe($.if('*.css', $.extReplace('.min.css')))
    .pipe(gulp.dest('dist/'))
    .pipe($.size({title: 'build:min', gzip: true}));
});

gulp.task('build:website', ['html', 'scripts', 'styles', 'images'], () => {
  const assets = $.useref.assets({searchPath: ['.tmp', 'website', '.']});

  return gulp.src('.tmp/*.html')
    .pipe(assets)
    .pipe($.if('*.js', $.uglify({preserveComments: 'license'})))
    .pipe($.if('*.css', $.minifyCss({compatibility: '*'})))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe(gulp.dest('dist/website'))
    .pipe($.size({title: 'build:website', gzip: true}));
});

gulp.task('serve:website', ['build:website'], () => {
  browserSync({
    notify: false,
    port: 9000,
    server: {
      baseDir: ['dist/website']
    }
  });
});

gulp.task('github:pages', ['build:website'], () => {
  return gulp.src('./dist/website/**/*')
    .pipe($.ghPages());
});

gulp.task('consistency-check', ['build:min'], (cb) => {
  exec('git status', function callback(error, stdout, stderr) {
    const pendingChanges = stdout.match(/modified:\s*dist/)
    if (pendingChanges) {
      throw new Error('consistency check failed');
    } else {
      cb();
    }
  });
});

gulp.task('github:release', ['consistency-check'], () => {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('env.GITHUB_TOKEN is empty');
  }

  var manifest = readJson('./package.json');
  const match = manifest.repository.url.split('/').slice(-2)

  return gulp.src([
    'dist/daterangepicker.js',
    'dist/daterangepicker.css',
    'dist/daterangepicker.min.js',
    'dist/daterangepicker.min.css'
  ])
    .pipe($.githubRelease({
      manifest: manifest,
      owner: match[0],
      repo: match[1]
    }));
});

gulp.task('bump:major', () => {
  bump('major');
});

gulp.task('bump:minor', () => {
  bump('minor');
});

gulp.task('bump:patch', () => {
  bump('patch');
});

gulp.task('default', ['clean'], () => {
  gulp.start('build');
});
