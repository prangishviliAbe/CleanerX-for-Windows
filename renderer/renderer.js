// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');

// Navigation
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.dataset.section;
    
    // Update active nav item
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');
    
    // Show corresponding section
    contentSections.forEach(section => {
      section.classList.remove('active');
      if (section.id === sectionId) {
        section.classList.add('active');
      }
    });
  });
});

// Format bytes to human readable
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Load system info on startup
async function loadSystemInfo() {
  try {
    const info = await window.electronAPI.getSystemInfo();
    
    document.getElementById('cpu-info').textContent = `${info.cpuModel} (${info.cpuCores} ბირთვი)`;
    document.getElementById('memory-info').textContent = `${info.usedMemory} / ${info.totalMemory}`;
    document.getElementById('system-info').textContent = `${info.hostname}`;
    document.getElementById('uptime-info').textContent = info.uptime;
  } catch (error) {
    console.error('Error loading system info:', error);
    document.getElementById('cpu-info').textContent = 'ვერ ჩაიტვირთა';
    document.getElementById('memory-info').textContent = 'ვერ ჩაიტვირთა';
    document.getElementById('system-info').textContent = 'ვერ ჩაიტვირთა';
    document.getElementById('uptime-info').textContent = 'ვერ ჩაიტვირთა';
  }
}

// Quick Scan
document.getElementById('quick-scan-btn').addEventListener('click', async () => {
  const btn = document.getElementById('quick-scan-btn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/>
    </svg>
    სკანირდება...
  `;
  
  try {
    const result = await window.electronAPI.quickScan();
    
    // Show results
    const scanResults = document.getElementById('scan-results');
    const resultsGrid = document.getElementById('results-grid');
    
    resultsGrid.innerHTML = result.details.map(item => `
      <div class="result-item">
        <h4>${item.label}</h4>
        <p>${formatBytes(item.size)}</p>
      </div>
    `).join('');
    
    document.getElementById('total-cleanable').textContent = result.totalCleanable;
    scanResults.style.display = 'block';
  } catch (error) {
    console.error('Scan error:', error);
    alert('სკანირების შეცდომა: ' + error.message);
  }
  
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    სწრაფი სკანირება
  `;
});

// Full Clean
document.getElementById('full-clean-btn').addEventListener('click', async () => {
  if (!confirm('გსურთ სრული გაწმენდა? ეს წაშლის ყველას მონიშნულ ფაილებს.')) {
    return;
  }
  
  const btn = document.getElementById('full-clean-btn');
  btn.disabled = true;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin">
      <circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/>
    </svg>
    იწმინდება...
  `;
  
  // Show progress
  const progressArea = document.getElementById('progress-area');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const resultMessage = document.getElementById('result-message');
  
  progressArea.style.display = 'block';
  resultMessage.style.display = 'none';
  
  // Animate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    progressFill.style.width = progress + '%';
  }, 200);
  
  try {
    const result = await window.electronAPI.fullClean();
    
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressText.textContent = 'დასრულებულია!';
    
    // Show result message
    setTimeout(() => {
      progressArea.style.display = 'none';
      progressFill.style.width = '0%';
      
      document.getElementById('result-text').textContent = result.message;
      resultMessage.style.display = 'flex';
    }, 500);
    
    // Refresh system info
    loadSystemInfo();
  } catch (error) {
    clearInterval(progressInterval);
    console.error('Clean error:', error);
    alert('გაწმენდის შეცდომა: ' + error.message);
    progressArea.style.display = 'none';
  }
  
  btn.disabled = false;
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    სრული გაწმენდა
  `;
});

// Clean Temp Files
document.getElementById('clean-temp-btn').addEventListener('click', () => performClean('clean-temp', 'clean-temp-btn'));

// Clean Browser Cache
document.getElementById('clean-browser-btn').addEventListener('click', () => performClean('clean-browser-cache', 'clean-browser-btn'));

// Clean Recycle Bin
document.getElementById('clean-recycle-btn').addEventListener('click', () => performClean('clean-recycle-bin', 'clean-recycle-btn'));

// Clean System Logs
document.getElementById('clean-logs-btn').addEventListener('click', () => performClean('clean-system-logs', 'clean-logs-btn'));

// Generic clean function
async function performClean(cleanFunction, buttonId) {
  const btn = document.getElementById(buttonId);
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'იწმინდება...';
  
  // Show progress
  const progressArea = document.getElementById('progress-area');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  const resultMessage = document.getElementById('result-message');
  
  progressArea.style.display = 'block';
  resultMessage.style.display = 'none';
  
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += Math.random() * 20;
    if (progress > 80) progress = 80;
    progressFill.style.width = progress + '%';
  }, 150);
  
  try {
    let result;
    switch(cleanFunction) {
      case 'clean-temp':
        result = await window.electronAPI.cleanTemp();
        break;
      case 'clean-browser-cache':
        result = await window.electronAPI.cleanBrowserCache();
        break;
      case 'clean-recycle-bin':
        result = await window.electronAPI.cleanRecycleBin();
        break;
      case 'clean-system-logs':
        result = await window.electronAPI.cleanSystemLogs();
        break;
    }
    
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressText.textContent = 'დასრულებულია!';
    
    setTimeout(() => {
      progressArea.style.display = 'none';
      progressFill.style.width = '0%';
      
      document.getElementById('result-text').textContent = result.message;
      resultMessage.style.display = 'flex';
    }, 500);
    
  } catch (error) {
    clearInterval(progressInterval);
    console.error('Clean error:', error);
    alert('გაწმენდის შეცდომა: ' + error.message);
    progressArea.style.display = 'none';
  }
  
  btn.disabled = false;
  btn.textContent = originalText;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSystemInfo();
  
  // Refresh system info every 30 seconds
  setInterval(loadSystemInfo, 30000);
});
