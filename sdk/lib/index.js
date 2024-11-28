#!/usr/bin/env node
const path = require("path");
const fs = require("fs-extra");
const yargs = require("yargs");
const { Uploader } = require("./uploader");
const packageJson = require("./../package.json");

function loadConfig(configPath) {
  const defaultConfigPath = path.resolve(
    __dirname,
    "./../cdn-upload.config.js",
  );

  const configPaths = [
    configPath ? path.resolve(process.cwd(), configPath) : null,
    path.resolve(process.cwd(), "cdn-upload.config.js"),
    defaultConfigPath,
  ].filter(Boolean);

  for (const tryPath of configPaths) {
    try {
      fs.accessSync(tryPath, fs.constants.R_OK);

      const config = require(tryPath);
      console.log(`Using configuration from: ${tryPath}`);
      return config;
    } catch (error) {
      // If file doesn't exist or can't be read, continue to next path
    }
  }

  console.warn("No configuration file found. Using default settings.");
  return {};
}

async function runCLI() {
  const argv = yargs
    .usage("Usage: asset-upload [options] <source-directory>")
    .version(packageJson.version)
    .option("server", {
      alias: "s",
      describe: "CDN Server URL",
      type: "string",
    })
    .option("config", {
      alias: "c",
      describe: "Path to configuration file",
      type: "string",
    })
    .option("include", {
      alias: "i",
      describe: "Include file patterns",
      type: "array",
    })
    .option("exclude", {
      alias: "e",
      describe: "Exclude file patterns",
      type: "array",
    })
    .option("dry-run", {
      describe: "Simulate upload without actual transfer",
      type: "boolean",
      default: false,
    })
    .help("help")
    .alias("help", "h").argv;

  const configOptions = loadConfig(argv.config);

  const mergedConfig = {
    serverUrl: argv.server || configOptions.serverUrl,
    include: argv.include || configOptions.include,
    exclude: argv.exclude || configOptions.exclude,
    ...configOptions,
  };

  const sourcePath = argv._[0] || process.cwd();

  if (!sourcePath) {
    console.error("Please provide a source directory");
    process.exit(1);
  }

  try {
    const uploader = new Uploader(mergedConfig);

    if (argv.dryRun) {
      console.log("Dry Run - Simulating upload");
      const files = uploader.findFiles(sourcePath);
      console.log("Files to be uploaded:", files);
    } else {
      await uploader.uploadAssets(sourcePath);
    }
  } catch (error) {
    console.error("Upload failed:", error.message);
    process.exit(1);
  }
}

runCLI().catch(console.error);
