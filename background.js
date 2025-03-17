// Configuration
let syncInterval = 60; // minutes
const DEFAULT_SOURCE = {
  url: 'https://trusttag.kuilef42.workers.dev/',
  name: 'Default List',
  enabled: true,
  etag: null
};
let dataSources = [DEFAULT_SOURCE];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Load configuration from storage
  loadConfigAndSync();
  
  // Set up periodic sync
  chrome.alarms.create('syncData', { periodInMinutes: syncInterval });
});

// Function to load config and sync data
function loadConfigAndSync() {
  chrome.storage.sync.get(['syncInterval', 'dataSources'], (result) => {
    console.log('Loaded configuration:', result);
    
    if (result.syncInterval) syncInterval = result.syncInterval;
    
    if (result.dataSources && Array.isArray(result.dataSources) && result.dataSources.length > 0) {
      dataSources = result.dataSources;
      console.log('Loaded data sources:', dataSources);
    } else {
      // If no data sources are found, use the default
      dataSources = [DEFAULT_SOURCE];
      // Save the default data source
      chrome.storage.sync.set({ dataSources });
    }
    
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

// Function to sync data from all enabled sources
async function syncData() {
  console.log('Starting data sync from multiple sources');
  
  // Update status to syncing
  updateSyncStatus('syncing', 'Syncing data...');
  
  try {
    // Filter enabled data sources
    const enabledSources = dataSources.filter(source => source.enabled);
    
    if (enabledSources.length === 0) {
      console.log('No enabled data sources');
      updateSyncStatus('warning', 'No enabled data sources');
      
      // Clear data if no sources are enabled
      chrome.storage.local.set({ trustTagData: [] }, () => {
        console.log('Cleared data due to no enabled sources');
      });
      
      return;
    }
    
    // Array to collect all data
    let allData = [];
    let totalEntries = 0;
    let updatedSources = [...dataSources];
    
    // Fetch data from each enabled source
    for (let i = 0; i < enabledSources.length; i++) {
      const source = enabledSources[i];
      const sourceIndex = dataSources.findIndex(s => s.url === source.url);
      
      try {
        console.log(`Fetching data from source ${i+1}/${enabledSources.length}:`, source.url);
        
        // Prepare headers for the request
        const headers = {};
        
        // Add ETag if we have one for conditional request
        if (source.etag) {
          headers['If-None-Match'] = source.etag;
        }
        
        console.log('Using ETag:', source.etag);
        
        // Fetch data from source
        const response = await fetch(source.url, { headers });
        
        // Check if we got a 304 Not Modified response
        if (response.status === 304) {
          console.log(`Data from ${source.url} not modified, using cached data`);
          
          // Get existing data for this source
          const result = await chrome.storage.local.get([`sourceData_${sourceIndex}`]);
          const cachedData = result[`sourceData_${sourceIndex}`] || [];
          
          // Add to all data
          allData = [...allData, ...cachedData];
          totalEntries += cachedData.length;
          
          continue;
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
          
          // Update the ETag for this source
          updatedSources[sourceIndex].etag = newETag;
        }
        
        // Parse the JSON response
        const data = await response.json();
        console.log(`Data received from ${source.url}:`, data);
        
        // Format the data for our extension
        let formattedData = [];
        
        if (Array.isArray(data)) {
          formattedData = data.map(record => ({
            address: record.fields.address || '',
            shortRemark: record.fields['short remark'] || '',
            noteText: record.fields['Note text'] || '',
            source: record.fields.Source || '',
            sourceUrl: source.url,
            sourceName: source.name
          })).filter(item => item.address);
        }
        
        // Store data for this source
        await chrome.storage.local.set({ [`sourceData_${sourceIndex}`]: formattedData });
        
        // Add to all data
        allData = [...allData, ...formattedData];
        totalEntries += formattedData.length;
        
      } catch (error) {
        console.error(`Error fetching data from ${source.url}:`, error);
        // Continue with other sources even if one fails
      }
    }
    
    // Update data sources with new ETags
    dataSources = updatedSources;
    chrome.storage.sync.set({ dataSources });
    
    // If no data was found from any source, use fallback data
    if (allData.length === 0) {
      console.log('No valid data found from any source, using fallback data');
      allData = [
        {
          address: 'example.com',
          shortRemark: 'false information',
          noteText: 'This site contains misleading information about various topics.',
          source: 'https://factcheck.org/example',
          sourceUrl: 'fallback',
          sourceName: 'Fallback Data'
        },
        {
          address: 'bbc.com',
          shortRemark: 'false information',
          noteText: 'This site contains misleading information.',
          source: 'https://example.com/source',
          sourceUrl: 'fallback',
          sourceName: 'Fallback Data'
        }
      ];
    }
    
    // Store combined data in local storage
    chrome.storage.local.set({ trustTagData: allData }, () => {
      console.log('All data synced successfully:', allData);
      updateSyncStatus('success', 'Data synced successfully', totalEntries);
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
      syncInterval,
      dataSources
    });
    return false; // Synchronous response
  }
  
  if (message.action === 'addDataSource') {
    const { url, name } = message.data;
    
    // Check if source already exists
    const exists = dataSources.some(source => source.url === url);
    
    if (!exists) {
      // Add new data source
      dataSources.push({
        url,
        name: name || url,
        enabled: true,
        etag: null
      });
      
      // Save updated data sources
      chrome.storage.sync.set({ dataSources }, () => {
        console.log('Added new data source:', url);
        // Sync data with new source
        syncData();
      });
    }
    
    sendResponse({ success: !exists, dataSources });
    return false;
  }
  
  if (message.action === 'removeDataSource') {
    const { url } = message.data;
    
    // Find index of source to remove
    const index = dataSources.findIndex(source => source.url === url);
    
    if (index !== -1) {
      // Remove data source
      dataSources.splice(index, 1);
      
      // Save updated data sources
      chrome.storage.sync.set({ dataSources }, () => {
        console.log('Removed data source:', url);
        
        // Remove stored data for this source
        chrome.storage.local.remove([`sourceData_${index}`], () => {
          // Sync data without removed source
          syncData();
        });
      });
    }
    
    sendResponse({ success: index !== -1, dataSources });
    return false;
  }
  
  if (message.action === 'toggleDataSource') {
    const { url, enabled } = message.data;
    
    // Find source to toggle
    const index = dataSources.findIndex(source => source.url === url);
    
    if (index !== -1) {
      // Toggle enabled state
      dataSources[index].enabled = enabled;
      
      // Save updated data sources
      chrome.storage.sync.set({ dataSources }, () => {
        console.log(`${enabled ? 'Enabled' : 'Disabled'} data source:`, url);
        // Sync data with updated sources
        syncData();
      });
    }
    
    sendResponse({ success: index !== -1, dataSources });
    return false;
  }
  
  return true;
});

// Initial load on startup
loadConfigAndSync();
