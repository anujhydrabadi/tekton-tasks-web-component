const path = require('path');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'tekton-tasks.umd.js',
    library: {
      name: 'TektonTasks',
      type: 'umd'
    },
    globalObject: 'this',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.html$/i,
        loader: 'html-loader',
        options: {
          minimize: true,
          esModule: false
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.css', '.html']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 8080,
    open: true
  },
  optimization: {
    minimize: true
  },
  mode: 'production'
};
