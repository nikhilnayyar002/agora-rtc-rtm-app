require('dotenv-flow').config()
const webpack = require("webpack")
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    module: {
        rules: [
            {
                test: /\.html$/,
                use: [{ loader: 'html-loader' }]
            },
            {
                test: /\.(svg|png|jpe?g|gif)$/i,
                use: [{
                    loader: 'file-loader',
                    options: {
                        name: '[name].[contenthash].[ext]',
                        outputPath: 'assets/'
                    }
                }]
            },
            {
                test: /\.css$/,
                use: [{ loader: 'css-loader' }]
            },
        ],
    },
    output: {
        path: `${__dirname}/dist`,
        filename: '[name].[contenthash].js',
        publicPath: '/',
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            filename: "./index.html",
            favicon: './src/favicon.ico',
        }),
        new webpack.EnvironmentPlugin(['APP_ID']),
        new ESLintPlugin(),
        new CleanTerminalPlugin()
    ]
}