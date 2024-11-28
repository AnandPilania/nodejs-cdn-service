#!/usr/bin/env node
const path = require('path');
const fs = require('fs-extra');
const yargs = require('yargs');
const { Uploader } = require('./uploader');
const packageJson = require('./../package.json');

// Configuration loader
function loadConfig(configPath) {
    const defaultConfigPath = path.resolve(__dirname, './../cdn-upload.config.js');

    // Array of potential config paths to try
    const configPaths = [
        // User-specified config (if provided)
        configPath ? path.resolve(process.cwd(), configPath) : null,

        // Local config in current working directory
        path.resolve(process.cwd(), 'cdn-upload.config.js'),

        // Default config in parent directory of the CLI tool
        defaultConfigPath
    ].filter(Boolean);

    for (const tryPath of configPaths) {
        try {
            // Check if file exists before attempting to require
            fs.accessSync(tryPath, fs.constants.R_OK);

            const config = require(tryPath);
            console.log(`Using configuration from: ${tryPath}`);
            return config;
        } catch (error) {
            // If file doesn't exist or can't be read, continue to next path
        }
    }

    // If no config found, return empty object with a warning
    console.warn('No configuration file found. Using default settings.');
    return {};
}

// Main CLI function
async function runCLI() {
    const argv = yargs
        .usage('Usage: asset-upload [options] <source-directory>')
        .version(packageJson.version)
        .option('server', {
            alias: 's',
            describe: 'CDN Server URL',
            type: 'string'
        })
        .option('config', {
            alias: 'c',
            describe: 'Path to configuration file',
            type: 'string'
        })
        .option('include', {
            alias: 'i',
            describe: 'Include file patterns',
            type: 'array'
        })
        .option('exclude', {
            alias: 'e',
            describe: 'Exclude file patterns',
            type: 'array'
        })
        .option('dry-run', {
            describe: 'Simulate upload without actual transfer',
            type: 'boolean',
            default: false
        })
        .help('help')
        .alias('help', 'h')
        .argv;

    // Load configuration
    const configOptions = loadConfig(argv.config);

    // Merge CLI options with config file
    const mergedConfig = {
        serverUrl: argv.server || configOptions.serverUrl,
        include: argv.include || configOptions.include,
        exclude: argv.exclude || configOptions.exclude,
        ...configOptions
    };

    const sourcePath = argv._[0] || process.cwd();

    if (!sourcePath) {
        console.error('Please provide a source directory');
        process.exit(1);
    }

    try {
        const uploader = new Uploader(mergedConfig);

        if (argv.dryRun) {
            console.log('Dry Run - Simulating upload');
            const files = uploader.findFiles(sourcePath);
            console.log('Files to be uploaded:', files);
        } else {
            await uploader.uploadAssets(sourcePath);
        }
    } catch (error) {
        console.error('Upload failed:', error.message);
        process.exit(1);
    }
}

// Run the CLI
runCLI().catch(console.error);
