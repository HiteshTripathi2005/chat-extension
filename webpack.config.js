const path = require('path');

module.exports = {
  entry: './src/sidepanel.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  devtool: 'cheap-module-source-map',
};
