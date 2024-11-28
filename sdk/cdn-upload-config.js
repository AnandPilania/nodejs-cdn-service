module.exports = {
  // CDN Server URL (overrides CLI argument)
  serverUrl: "http://localhost:3000/upload",

  // Include patterns
  include: ["**/*.js", "**/*.css", "**/*.html"],

  // Exclude patterns
  exclude: [
    "**/node_modules/**",
    "**/*.test.js",
    "**/temp/**",
    "**/*.xlsx",
    "**/*.pdf",
    "**/*.scss",
    "**/*.ico",
    "**/*.ttf",
    "**/*.php",
    "**/*.bak",
  ],

  // Additional configuration
  concurrentUploads: 10,
  timeout: 600000,

  // Custom ignore patterns
  ignorePatterns: ["**/*.map", "**/.DS_Store"],
};
