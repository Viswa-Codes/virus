const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const STORAGE_DIR = path.resolve(__dirname, 'storage');

// Ensure storage exists
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

function safeJoin(base, target) {
  const targetPath = path.resolve(base, target);
  if (!targetPath.startsWith(base)) throw new Error('Invalid path');
  return targetPath;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/upload') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const username = (payload.username || 'anonymous').replace(/[^a-zA-Z0-9-_]/g, '_');
        const userDir = safeJoin(STORAGE_DIR, username);
        if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `upload-${timestamp}.json`;
        const outPath = path.join(userDir, filename);

        fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: outPath }));
        console.log(`Received upload for ${username} -> ${outPath}`);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });

    req.on('error', (err) => {
      res.writeHead(500);
      res.end();
    });

    return;
  }

  // Basic routes
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('System Info Receiver is running');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Storage directory: ${STORAGE_DIR}`);
});
