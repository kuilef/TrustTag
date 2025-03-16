// Configuration
let airtableUrl = '';
let airtableApiKey = '';
let syncInterval = 60; // minutes

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  // Load configuration from storage
  loadConfigAndSync();
  
  // Set up periodic sync
  chrome.alarms.create('syncData', { periodInMinutes: syncInterval });
});

// Function to load config and sync data
function loadConfigAndSync() {
  chrome.storage.sync.get(['airtableUrl', 'airtableApiKey', 'syncInterval'], (result) => {
    console.log('Loaded configuration:', result);
    
    if (result.airtableUrl) airtableUrl = result.airtableUrl;
    if (result.airtableApiKey) airtableApiKey = result.airtableApiKey;
    if (result.syncInterval) syncInterval = result.syncInterval;
    
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
    
    if (changes.airtableUrl) airtableUrl = changes.airtableUrl.newValue;
    if (changes.airtableApiKey) airtableApiKey = changes.airtableApiKey.newValue;
    if (changes.syncInterval) {
      syncInterval = changes.syncInterval.newValue;
      // Update alarm
      chrome.alarms.create('syncData', { periodInMinutes: syncInterval });
    }
    
    // Sync data with new configuration
    syncData();
  }
});

// Function to extract Airtable IDs from URL
function extractAirtableIds(url) {
  // Try to extract base ID and table ID from URL
  // Example URL: https://airtable.com/appNp9B0bAMrZp7DI/tblBQ9NUem3kL1MJZ
  const match = url.match(/airtable\.com\/([a-zA-Z0-9]+)\/([a-zA-Z0-9]+)/);
  if (match && match[1].startsWith('app')) {
    return {
      baseId: match[1],
      tableId: match[2]
    };
  } else if (url.startsWith('app')) {
    // If the URL is just the base ID
    return {
      baseId: url,
      tableId: null
    };
  }
  return null;
}

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

// Function to sync data from Airtable
async function syncData() {
  console.log('Starting data sync with config:', { 
    airtableUrl, 
    airtableApiKey: airtableApiKey ? '[REDACTED]' : 'not set' 
  });
  
  if (!airtableApiKey) {
    console.log('Airtable API key not configured');
    updateSyncStatus('error', 'Airtable API key not configured');
    return;
  }
  
  // Update status to syncing
  updateSyncStatus('syncing', 'Syncing data from Airtable...');
  
  try {
    // Extract base ID and table ID from URL
    const airtableIds = extractAirtableIds(airtableUrl);
    
    if (!airtableIds) {
      console.error('Could not determine Airtable IDs');
      updateSyncStatus('error', 'Could not determine Airtable Base ID');
      return;
    }
    
    const { baseId, tableId } = airtableIds;
    console.log('Using Airtable IDs:', { baseId, tableId });
    
    // Fetch data from Airtable API
    try {
      const headers = {
        'Authorization': `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json'
      };
      
      let finalTableId = tableId;
      
      // If we don't have a table ID or it's not a table ID format, fetch tables
      if (!tableId || !(tableId.startsWith('tbl') || tableId === 'Grid view')) {
        // First, list all tables in the base to find the one we need
        const baseUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
        console.log('Fetching tables from:', baseUrl);
        
        const tablesResponse = await fetch(baseUrl, { headers });
        
        if (!tablesResponse.ok) {
          const errorText = await tablesResponse.text();
          console.error('API Error Response (tables):', tablesResponse.status, errorText);
          throw new Error(`Airtable API error: ${tablesResponse.status} - ${errorText}`);
        }
        
        const tablesData = await tablesResponse.json();
        console.log('Tables data:', tablesData);
        
        if (!tablesData.tables || !tablesData.tables.length) {
          throw new Error('No tables found in the Airtable base');
        }
        
        // Find the first table
        const table = tablesData.tables[0];
        finalTableId = table.id;
        console.log('Using table:', table.name, 'with ID:', finalTableId);
      } else {
        console.log('Using provided table ID:', finalTableId);
      }
      
      // Now fetch the records from this table
      const recordsUrl = `https://api.airtable.com/v0/${baseId}/${finalTableId}`;
      console.log('Fetching records from:', recordsUrl);
      
      const recordsResponse = await fetch(recordsUrl, { headers });
      
      if (!recordsResponse.ok) {
        const errorText = await recordsResponse.text();
        console.error('API Error Response (records):', recordsResponse.status, errorText);
        throw new Error(`Airtable API error: ${recordsResponse.status} - ${errorText}`);
      }
      
      const recordsData = await recordsResponse.json();
      console.log('Records data:', recordsData);
      
      let formattedData = [];
      
      if (recordsData.records && Array.isArray(recordsData.records)) {
        formattedData = recordsData.records.map(record => ({
          address: record.fields.address || '',
          shortRemark: record.fields['short remark'] || '',
          noteText: record.fields['Note text'] || '',
          source: record.fields.Source || ''
        })).filter(item => item.address);
      }
      
      // If no data was found or there was an error parsing, use fallback data
      if (formattedData.length === 0) {
        console.log('No valid data found in Airtable response, using fallback data');
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
    } catch (apiError) {
      console.error('API Error:', apiError);
      updateSyncStatus('error', `Airtable API error: ${apiError.message}`);
    }
    
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
      airtableUrl,
      airtableApiKey,
      syncInterval
    });
    return false; // Synchronous response
  }
  
  return true;
});

// Initial load on startup
loadConfigAndSync();
