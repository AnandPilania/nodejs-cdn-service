#!/usr/bin/env node
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const glob = require("glob");
const FormData = require('form-data');

class Uploader {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'http://localhost:3000/cdn',
            include: config.include || ['**/*'],
            exclude: config.exclude || [],
            recursive: config.recursive !== false,
            ignorePatterns: config.ignorePatterns || [
                '**/*.map',
                '**/*.log',
                '**/.DS_Store'
            ],
            concurrentUploads: config.concurrentUploads || 5,
            timeout: config.timeout || 3000000
        };
    }

    findFiles(sourcePath) {
        const options = {
            cwd: sourcePath,
            nodir: true,
            ignore: [
                ...this.config.exclude,
                ...this.config.ignorePatterns
            ]
        };

        return this.config.include.flatMap(pattern =>
            glob.sync(pattern, options)
        );
    }

    async uploadAssets(sourcePath) {
        const files = this.findFiles(sourcePath);

        console.log(`Found ${files.length} files to upload`);

        // Implement concurrent uploads with limit
        const uploadQueue = files.map(file => () => this.uploadSingleFile(file, sourcePath));

        return this.concurrentProcess(uploadQueue, this.config.concurrentUploads);
    }

    async concurrentProcess(tasks, concurrency) {
        const results = [];
        const executing = [];

        for (const task of tasks) {
            const p = Promise.resolve().then(() => task());
            results.push(p);

            if (concurrency <= tasks.length) {
                const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                executing.push(e);

                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                }
            }
        }

        return Promise.all(results);
    }

    async uploadSingleFile(relativePath, basePath) {
        const fullPath = path.join(basePath, relativePath);
        const fileStats = await fs.stat(fullPath);
        const fileContent = await fs.createReadStream(fullPath);
        const formData = new FormData();

        formData.append('fullPath', relativePath);
        formData.append('basePath', basePath);
        formData.append('file', fileContent, {
            filename: relativePath,
            contentType: this.getMimeType(relativePath)
        });

        try {
            const response = await axios.post(`${this.config.serverUrl}/upload`, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                timeout: this.config.timeout,
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            });

            console.log(`Uploaded: ${relativePath} - ${response.data.message}`);
            return response.data;
        } catch (error) {
            console.error(`Failed to upload ${relativePath}:`,
                error.response ? error.response.data : error.message
            );
            throw error;
        }
    }

    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.html': 'text/html',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}

// Export for module and CLI usage
module.exports = { Uploader };
