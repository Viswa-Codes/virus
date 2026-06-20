const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const STORAGE_DIR = path.resolve(__dirname, 'storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function safeJoin(base, target) {
    const targetPath = path.resolve(base, target);

    if (!targetPath.startsWith(base)) {
        throw new Error('Invalid path');
    }

    return targetPath;
}

function getAllFiles(dir, results = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            getAllFiles(fullPath, results);
        } else {
            results.push(path.relative(STORAGE_DIR, fullPath));
        }
    }

    return results;
}

const server = http.createServer((req, res) => {

    // ===============================
    // UPLOAD ROUTE
    // ===============================
    if (req.method === 'POST' && req.url === '/upload') {

        let body = '';

        req.on('data', chunk => {
            body += chunk;
        });

        req.on('end', () => {
            try {
                const payload = JSON.parse(body);

                const username =
                    (payload.username || 'anonymous')
                        .replace(/[^a-zA-Z0-9_-]/g, '_');

                const userDir = safeJoin(STORAGE_DIR, username);

                if (!fs.existsSync(userDir)) {
                    fs.mkdirSync(userDir, { recursive: true });
                }

                const timestamp = new Date()
                    .toISOString()
                    .replace(/[:.]/g, '-');

                const filename = `upload-${timestamp}.json`;

                const outputPath = path.join(userDir, filename);

                fs.writeFileSync(
                    outputPath,
                    JSON.stringify(payload, null, 2),
                    'utf8'
                );

                console.log(
                    `Received upload from ${username} -> ${outputPath}`
                );

                res.writeHead(200, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    success: true,
                    file: filename,
                    user: username,
                    path: path.relative(STORAGE_DIR, outputPath)
                }));

            } catch (err) {

                res.writeHead(400, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    success: false,
                    error: err.message
                }));
            }
        });

        return;
    }

    // ===============================
    // HOME ROUTE
    // ===============================
    if (req.method === 'GET' && req.url === '/') {

        res.writeHead(200, {
            'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
            status: 'running',
            uploadEndpoint: '/upload',
            filesEndpoint: '/files'
        }, null, 2));

        return;
    }

    // ===============================
    // LIST FILES
    // ===============================
    if (req.method === 'GET' && req.url === '/files') {

        try {

            const files = getAllFiles(STORAGE_DIR);

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                count: files.length,
                files
            }, null, 2));

        } catch (err) {

            res.writeHead(500, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                success: false,
                error: err.message
            }));
        }

        return;
    }

    // ===============================
    // VIEW FILE CONTENT
    // Example:
    // /file/anonymous/upload-xxx.json
    // ===============================
    if (
        req.method === 'GET' &&
        req.url.startsWith('/file/')
    ) {

        try {

            const relativePath =
                decodeURIComponent(
                    req.url.replace('/file/', '')
                );

            const filePath =
                safeJoin(STORAGE_DIR, relativePath);

            if (!fs.existsSync(filePath)) {

                res.writeHead(404, {
                    'Content-Type': 'application/json'
                });

                res.end(JSON.stringify({
                    success: false,
                    error: 'File not found'
                }));

                return;
            }

            const content =
                fs.readFileSync(filePath, 'utf8');

            res.writeHead(200, {
                'Content-Type': 'application/json'
            });

            res.end(content);

        } catch (err) {

            res.writeHead(400, {
                'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
                success: false,
                error: err.message
            }));
        }

        return;
    }

    // ===============================
    // 404
    // ===============================
    res.writeHead(404, {
        'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
        success: false,
        error: 'Route not found'
    }));
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Storage: ${STORAGE_DIR}`);
});