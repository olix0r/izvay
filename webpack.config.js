const Webpack = require("webpack");

const configurator = {
  // entries is a function that defines which artifacts will be built. Each artifact will be built
  // and written to target/, as defined by the buildConfig function below. You can hardcode which
  // artifacts will be built, as I've done below, or you can customize logic (e.g., with a glob or
  // regex) to define this.
  entries: function () {
    var entries = {
      application: [
        './src/index.tsx',
      ],
    }

    return entries
  },

  plugins() {
    // Webpack plugins can be inserted here. These typically help you if you're doing a frontend
    // project and will do things like minifying your CSS or copying static assets like fonts or
    // images into target/ for serving.
    var plugins = [];

    return plugins
  },

  moduleOptions: function () {
    return {
      // rules tell webpack how to handle different filetypes. If this were a frontend project,
      // you could add rules here to tell webpack how to handle CSS/SCSS files, JS/JSX files, etc..
      // For now, there's only one rule, which is how to handle Typescript files.
      rules: [
        { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
        // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
        { test: /\.js$/, enforce: "pre", loader: "source-map-loader", },
        { test: /\.svg$/, use: ['@svgr/webpack', 'url-loader'], }
      ]
    }
  },

  buildConfig: function () {
    return {
      mode: process.env.NODE_ENV || "development",
      devtool: "source-map",
      devServer: {
        port: 8812,
      },

      entry: configurator.entries(),
      output: { filename: "main.js", path: `${__dirname}/target` },
      plugins: configurator.plugins(),
      module: configurator.moduleOptions(),
      resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json']
      },
      // When importing a module whose path matches one of the following, just
      // assume a corresponding global variable exists and use that instead.
      // This is important because it allows us to avoid bundling all of our
      // dependencies, which allows browsers to cache those libraries between builds.
      externals: {
        react: "React",
        "react-dom": "ReactDOM"
      }
    };
  }
}

module.exports = configurator.buildConfig()
