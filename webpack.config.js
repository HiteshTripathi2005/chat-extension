const path = require('path');

module.exports = {
  entry: {
    sidepanel: './src/sidepanel.js',
    background: './src/background.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development',
  devtool: 'cheap-module-source-map',
  target: 'web',
};
