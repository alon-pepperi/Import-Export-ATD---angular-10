const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");
const singleSpaAngularWebpack = require('single-spa-angular-webpack5/lib/webpack').default;
const { merge } = require('webpack-merge');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (angularWebpackConfig, options) => {
    const mfConfig = {
        output: {
          uniqueName: "import_export_atd"
        },
        // optimization: {
        //   // Only needed to bypass a temporary bug
        //   runtimeChunk: false,
        //   minimize: true,
        //   minimizer: [
        //   new TerserPlugin({
        //     extractComments: false,
        //     terserOptions: {keep_fnames: /^.$/}
        //   })]

        // },
        externals: {
        //   'react': 'React'
        },
        plugins: [
        //   new webpack.DefinePlugin({
        //     'process.env.NODE_ENV': JSON.stringify('development')
        // }),
          new ModuleFederationPlugin({
            remotes: {},
            name: "import_export_atd",
            filename: "import_export_atd.js",
            exposes: {
             './ImportAtdModule': './src/app/import-atd/index.ts',
              './ImportAtdComponent': './src/app/import-atd/index.ts',
              './ExportAtdModule': './src/app/export-atd/index.ts',
              './ExportAtdComponent': './src/app/export-atd/index.ts'
            },
            shared: {
              "@angular/core": { eager: true, singleton: true,  strictVersion: false  },
              "@angular/common": { eager: true,singleton: true,strictVersion: false   },
            }
          }),
        ],
      };

    const merged = merge(angularWebpackConfig, mfConfig);
    const singleSpaWebpackConfig = singleSpaAngularWebpack(merged, options);
    return singleSpaWebpackConfig;
};
