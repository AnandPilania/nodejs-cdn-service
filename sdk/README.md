# Asset Upload CLI

## Installation

### Global Installation
```bash
npm install -g @niit/cdn-upload-cli
```

### Local Project Installation
```bash
npm install --save-dev @niit/cdn-upload-cli
```

## Usage

### Basic Usage
```bash
# Upload files from current directory
cdn-upload

# Upload specific directory
cdn-upload ./dist

# Specify CDN server
cdn-upload ./dist -s https://cdn.example.com
```

### Advanced Options
```bash
# Specify asset type
cdn-upload ./assets -t images

# Include/Exclude patterns
cdn-upload ./dist -i "**/*.js" -e "**/test/**"

# Dry run (simulate upload)
asset-upload ./dist --dry-run
```

### Configuration File
Create `cdn-upload.config.js` in your project:

```javascript
module.exports = {
  serverUrl: 'https://cdn.example.com/upload',
  assetType: 'web',
  include: ['**/*.js', '**/*.css'],
  exclude: ['**/node_modules/**']
};
```

## Options
- `-s, --server`: CDN Server URL
- `-t, --type`: Asset type/category
- `-c, --config`: Path to configuration file
- `-i, --include`: Include file patterns
- `-e, --exclude`: Exclude file patterns
- `--dry-run`: Simulate upload without transfer
