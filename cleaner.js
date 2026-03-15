const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec, execSync } = require('child_process');
const log = require('electron-log');

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper function to delete files in directory
async function deleteFilesInDir(dirPath, extensions = null) {
  let deletedSize = 0;
  let deletedCount = 0;
  
  if (!fs.existsSync(dirPath)) {
    return { deletedSize, deletedCount };
  }
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      try {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isFile()) {
          // If extensions filter is provided, check if file matches
          if (extensions && !extensions.some(ext => file.toLowerCase().endsWith(ext.toLowerCase()))) {
            continue;
          }
          
          const fileSize = stat.size;
          fs.unlinkSync(filePath);
          deletedSize += fileSize;
          deletedCount++;
        } else if (stat.isDirectory()) {
          // Recursively handle subdirectories
          const subResult = await deleteFilesInDir(filePath, extensions);
          deletedSize += subResult.deletedSize;
          deletedCount += subResult.deletedCount;
        }
      } catch (err) {
        // Skip files that can't be deleted (in use, permissions, etc.)
        log.warn(`Could not delete ${file}: ${err.message}`);
      }
    }
  } catch (err) {
    log.error(`Error reading directory ${dirPath}: ${err.message}`);
  }
  
  return { deletedSize, deletedCount };
}

// Clean temporary files
async function cleanTempFiles() {
  log.info('Starting temp files cleanup...');
  let totalDeleted = { size: 0, count: 0 };
  const results = [];
  
  // Windows Temp folders
  const tempPaths = [
    os.tmpdir(),
    path.join(os.homedir(), 'AppData', 'Local', 'Temp'),
    'C:\\Windows\\Temp'
  ];
  
  for (const tempPath of tempPaths) {
    try {
      const result = await deleteFilesInDir(tempPath);
      totalDeleted.size += result.deletedSize;
      totalDeleted.count += result.deletedCount;
      results.push({ path: tempPath, ...result });
      log.info(`Cleaned ${tempPath}: ${result.deletedCount} files, ${formatBytes(result.deletedSize)}`);
    } catch (err) {
      log.warn(`Could not clean ${tempPath}: ${err.message}`);
    }
  }
  
  return {
    success: true,
    message: `წარმატებით გაიწმინდა ${totalDeleted.count} ფაილი (${formatBytes(totalDeleted.size)})`,
    details: results,
    freedSpace: totalDeleted.size
  };
}

// Clean browser cache
async function cleanBrowserCache() {
  log.info('Starting browser cache cleanup...');
  let totalDeleted = { size: 0, count: 0 };
  const results = [];
  const userProfile = os.homedir();
  
  // Common browser cache paths
  const browserCachePaths = [
    // Chrome
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Code Cache'),
    // Firefox
    path.join(userProfile, 'AppData', 'Local', 'Mozilla', 'Firefox', 'Profiles'),
    // Edge
    path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache'),
    // Opera
    path.join(userProfile, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable', 'Cache')
  ];
  
  for (const cachePath of browserCachePaths) {
    try {
      if (fs.existsSync(cachePath)) {
        const stat = fs.statSync(cachePath);
        if (stat.isDirectory()) {
          const result = await deleteFilesInDir(cachePath);
          totalDeleted.size += result.deletedSize;
          totalDeleted.count += result.deletedCount;
          results.push({ path: cachePath, ...result });
        }
      }
    } catch (err) {
      log.warn(`Could not clean browser cache at ${cachePath}: ${err.message}`);
    }
  }
  
  return {
    success: true,
    message: `ბრაუზერის ქეში გაიწმინდა: ${totalDeleted.count} ფაილი (${formatBytes(totalDeleted.size)})`,
    details: results,
    freedSpace: totalDeleted.size
  };
}

// Clean recycle bin
async function cleanRecycleBin() {
  log.info('Starting recycle bin cleanup...');
  
  try {
    // Use PowerShell to empty recycle bin
    const { execSync } = require('child_process');
    execSync('Clear-RecycleBin -Force -ErrorAction SilentlyContinue', { 
      encoding: 'utf8',
      windowsHide: true 
    });
    
    return {
      success: true,
      message: 'სამარხვო ყუთი გაიწმინდა',
      details: [],
      freedSpace: 0
    };
  } catch (err) {
    log.error(`Error cleaning recycle bin: ${err.message}`);
    return {
      success: true,
      message: 'სამარხვო ყუთის გაწმენდა ვერ მოხერხდა',
      details: [],
      freedSpace: 0
    };
  }
}

// Clean system logs
async function cleanSystemLogs() {
  log.info('Starting system logs cleanup...');
  let totalDeleted = { size: 0, count: 0 };
  const results = [];
  
  // Windows Update cleanup (requires admin, will try anyway)
  try {
    const tempPath = 'C:\\Windows\\SoftwareDistribution\\Download';
    if (fs.existsSync(tempPath)) {
      const result = await deleteFilesInDir(tempPath);
      totalDeleted.size += result.deletedSize;
      totalDeleted.count += result.deletedCount;
      results.push({ path: tempPath, ...result });
    }
  } catch (err) {
    log.warn(`Could not clean Windows Update cache: ${err.message}`);
  }
  
  // Prefetch (requires admin)
  try {
    const prefetchPath = 'C:\\Windows\\Prefetch';
    if (fs.existsSync(prefetchPath)) {
      const result = await deleteFilesInDir(prefetchPath, ['.pf']);
      totalDeleted.size += result.deletedSize;
      totalDeleted.count += result.deletedCount;
      results.push({ path: prefetchPath, ...result });
    }
  } catch (err) {
    log.warn(`Could not clean Prefetch: ${err.message}`);
  }
  
  return {
    success: true,
    message: `სისტემური ლოგები გაიწმინდა: ${totalDeleted.count} ფაილი (${formatBytes(totalDeleted.size)})`,
    details: results,
    freedSpace: totalDeleted.size
  };
}

// Get system information
async function getSystemInfo() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    platform: os.platform(),
    hostname: os.hostname(),
    cpuModel: cpus[0].model,
    cpuCores: cpus.length,
    totalMemory: formatBytes(totalMemory),
    usedMemory: formatBytes(usedMemory),
    freeMemory: formatBytes(freeMemory),
    uptime: formatUptime(os.uptime())
  };
}

// Format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  let uptime = '';
  if (days > 0) uptime += `${days} დღე `;
  if (hours > 0) uptime += `${hours} საათი `;
  if (minutes > 0) uptime += `${minutes} წუთი`;
  
  return uptime.trim() || '0 წუთი';
}

// Quick scan - analyze what's cleanable
async function quickScan() {
  log.info('Running quick scan...');
  let totalCleanable = 0;
  const results = [];
  
  // Scan temp files
  const tempPaths = [os.tmpdir(), path.join(os.homedir(), 'AppData', 'Local', 'Temp')];
  let tempSize = 0;
  for (const tempPath of tempPaths) {
    try {
      if (fs.existsSync(tempPath)) {
        const files = fs.readdirSync(tempPath);
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(tempPath, file));
            if (stat.isFile()) tempSize += stat.size;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  results.push({ type: 'temp', size: tempSize, label: 'დროებითი ფაილები' });
  totalCleanable += tempSize;
  
  // Scan browser cache
  const userProfile = os.homedir();
  const browserCachePaths = [
    path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
    path.join(userProfile, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Cache')
  ];
  let cacheSize = 0;
  for (const cachePath of browserCachePaths) {
    try {
      if (fs.existsSync(cachePath)) {
        const files = fs.readdirSync(cachePath);
        for (const file of files) {
          try {
            const stat = fs.statSync(path.join(cachePath, file));
            if (stat.isFile()) cacheSize += stat.size;
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  results.push({ type: 'cache', size: cacheSize, label: 'ბრაუზერის ქეში' });
  totalCleanable += cacheSize;
  
  return {
    success: true,
    totalCleanable: formatBytes(totalCleanable),
    details: results
  };
}

// Full clean - run all cleaning operations
async function fullClean() {
  log.info('Running full clean...');
  let totalFreed = 0;
  const results = [];
  
  // Clean temp files
  const tempResult = await cleanTempFiles();
  totalFreed += tempResult.freedSpace;
  results.push({ operation: 'temp', ...tempResult });
  
  // Clean browser cache
  const cacheResult = await cleanBrowserCache();
  totalFreed += cacheResult.freedSpace;
  results.push({ operation: 'cache', ...cacheResult });
  
  // Clean recycle bin
  const recycleResult = await cleanRecycleBin();
  results.push({ operation: 'recycle', ...recycleResult });
  
  // Clean system logs
  const logsResult = await cleanSystemLogs();
  totalFreed += logsResult.freedSpace;
  results.push({ operation: 'logs', ...logsResult });
  
  return {
    success: true,
    message: `სრული გაწმენდა დასრულდა! გათავისუფლდა: ${formatBytes(totalFreed)}`,
    freedSpace: totalFreed,
    results: results
  };
}

module.exports = {
  cleanTempFiles,
  cleanBrowserCache,
  cleanRecycleBin,
  cleanSystemLogs,
  getSystemInfo,
  quickScan,
  fullClean,
  formatBytes
};
