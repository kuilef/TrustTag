// Configuration
let syncInterval = 60; // minutes
const API_URL = 'https://trusttag.kuilef42.workers.dev/';
let currentETag = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Load configuration from storage
  loadConfigAndSync();
  
  // Set up periodic sync
  chrome.alarms.create('syncData', { periodInMinutes: syncInterval });
});

// Function to load config and sync data
function loadConfigAndSync() {
  chrome.storage.sync.get(['syncInterval', 'etag'], (result) => {
    console.log('Loaded configuration:', result);
    
    if (result.syncInterval) syncInterval = result.syncInterval;
    if (result.etag) currentETag = result.etag;
    
    // Initial data sync
    syncData();
  });
}

// Listen for alarm to sync data
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncData') {
    syncData();
  }
});

// Listen for configuration changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    console.log('Configuration changed:', changes);
    
    if (changes.syncInterval) {
      syncInterval = changes.syncInterval.newValue;
      // Update alarm
      chrome.alarms.create('syncData', { periodInMinutes: syncInterval });
    }
    
    // Sync data with new configuration
    syncData();
  }
});

// Sync status tracking
let syncStatus = {
  lastSync: null,
  status: 'unknown', // 'success', 'error', 'syncing', 'unknown'
  message: 'Not synced yet',
  dataCount: 0
};

// Function to update sync status
function updateSyncStatus(status, message, dataCount = null) {
  syncStatus.status = status;
  syncStatus.message = message;
  
  if (status === 'success' || status === 'error') {
    syncStatus.lastSync = new Date().toISOString();
  }
  
  if (dataCount !== null) {
    syncStatus.dataCount = dataCount;
  }
  
  // Store sync status in local storage
  chrome.storage.local.set({ syncStatus });
  console.log('Updated sync status:', syncStatus);
}

// Function to sync data from Cloudflare worker
async function syncData() {
  console.log('Starting data sync');
  
  // Update status to syncing
  updateSyncStatus('syncing', 'Syncing data...');
  
  try {
    // Prepare headers for the request
    const headers = {};
    
    // Add ETag if we have one for conditional request
    if (currentETag) {
      headers['If-None-Match'] = currentETag;
    }
    
    console.log('Fetching data from:', API_URL);
    console.log('Using ETag:', currentETag);
    
    // Fetch data from Cloudflare worker
    const response = await fetch(API_URL, { headers });
    
    // Check if we got a 304 Not Modified response
    if (response.status === 304) {
      console.log('Data not modified, using cached data');
      updateSyncStatus('success', 'Data is up to date (not modified)');
      return;
    }
    
    // Check for other errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    // Get the new ETag from the response
    const newETag = response.headers.get('ETag');
    if (newETag) {
      console.log('New ETag received:', newETag);
      currentETag = newETag;
      
      // Store the ETag for future requests
      chrome.storage.sync.set({ etag: newETag });
    }
    
    // Parse the JSON response
    const data = await response.json();
    console.log('Data received:', data);
    
    // Format the data for our extension
    let formattedData = [];
    
    if (Array.isArray(data)) {
      formattedData = data.map(record => ({
        address: record.fields.address || '',
        shortRemark: record.fields['short remark'] || '',
        noteText: record.fields['Note text'] || '',
        source: record.fields.Source || ''
      })).filter(item => item.address);
    }
    
    // If no data was found or there was an error parsing, use fallback data
    if (formattedData.length === 0) {
      console.log('No valid data found in response, using fallback data');
      formattedData = [
        {
          address: 'example.com',
          shortRemark: 'false information',
          noteText: 'This site contains misleading information about various topics.',
          source: 'https://factcheck.org/example'
        },
        {
          address: 'bbc.com',
          shortRemark: 'false information',
          noteText: 'This site contains misleading information.',
          source: 'https://example.com/source'
        }
      ];
    }
    
    // Store data in local storage
    chrome.storage.local.set({ trustTagData: formattedData }, () => {
      console.log('Data synced successfully:', formattedData);
      updateSyncStatus('success', 'Data synced successfully', formattedData.length);
    });
    
  } catch (error) {
    console.error('Error syncing data:', error);
    updateSyncStatus('error', `Error: ${error.message}`);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  if (message.action === 'syncData') {
    syncData();
    sendResponse({ success: true });
    return true; // Indicates async response
  }
  
  if (message.action === 'getSyncStatus') {
    sendResponse({ syncStatus });
    return false; // Synchronous response
  }
  
  if (message.action === 'getConfig') {
    sendResponse({
      syncInterval
    });
    return false; // Synchronous response
  }
  
  return true;
});

// Initial load on startup
loadConfigAndSync();
