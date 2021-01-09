/* eslint-env node */

const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require("copy-webpack-plugin")
const Dotenv = require('dotenv-webpack')
const ESLintPlugin = require('eslint-webpack-plugin')
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin')

module.exports = {
    entry: './src/index.js',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.html$/,
                loader: 'html-loader',
                options: { minimize: true }
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
            {
                test: /\.(svg|png|jpe?g|gif)$/i,
                loader: 'file-loader'
            },
        ],
    },
    output: {
        path: `${__dirname}/dist`,
        filename: 'index.js',
        publicPath: '',
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
            filename: "./index.html"
        }),
        new MiniCssExtractPlugin({
            // Options similar to the same options in webpackOptions.output
            // both options are optional
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),
        new CopyPlugin({
            patterns: [
                { from: "./src/favicon.ico", to: "./" },
            ],
        }),
        new Dotenv({
            path: "./.env.local"
        }),
        new ESLintPlugin(),
        new CleanTerminalPlugin()
    ],
    devServer: {
        port: process.env.CLIENT_PORT,
        proxy: {
            '/socket.io': {
                target: `http://localhost:${process.env.SERVER_PORT}`,
                ws: true
            },
        },
        stats: {
            preset: 'none',
            errors: true,
            warnings: true
        },
    }
}