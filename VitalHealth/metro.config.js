// metro.config.js

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// add GLB support
config.resolver.assetExts.push("glb");

module.exports = config;
