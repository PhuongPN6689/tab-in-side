module.exports = {
  sourceDir: 'src',
  ignoreFiles: [
    'assets',
    '*.zip',
    '.DS_Store',
    '**/.DS_Store',
    '.git',
    '**/.git',
    'README.md',
    'LICENSE',
    '.gitignore',
    'web-ext-config.cjs'
  ],
  build: {
    overwriteDest: true
  }
};
