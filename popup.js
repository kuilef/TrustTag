// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get references to form elements
  const airtableUrlInput = document.getElementById('airtableUrl');
  const airtableApiKeyInput = document.getElementById('airtableApiKey');
  const syncIntervalSelect = document.getElementById('syncInterval');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  const syncNowButton = document.getElementById('syncNowButton');
  
  // Get references to sync status elements
  const syncDot = document.querySelector('.sync-dot');
  const syncStatusText = document.getElementById('syncStatusText');
  const lastSyncTime = document.getElementById('lastSyncTime');
  const syncDataCount = document.getElementById('syncDataCount');
  
  // Load saved settings
  loadSettings();
  
  // Load sync status
  loadSyncStatus();
  
  // Add event listeners
  saveButton.addEventListener('click', saveSettings);
  syncNowButton.addEventListener('click', syncNow);
  
  // Function to load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['airtableUrl', 'airtableApiKey', 'syncInterval'], (result) => {
      console.log('Loading settings from storage:', result);
      
      if (result.airtableUrl) {
        airtableUrlInput.value = result.airtableUrl;
      }
      
      if (result.airtableApiKey) {
        airtableApiKeyInput.value = result.airtableApiKey;
      }
      
      if (result.syncInterval) {
        syncIntervalSelect.value = result.syncInterval.toString();
      }
      
      // Also check with background script for current values
      chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
        console.log('Current config from background:', response);
        if (response) {
          if (response.airtableUrl && !airtableUrlInput.value) {
            airtableUrlInput.value = response.airtableUrl;
          }
          if (response.airtableApiKey && !airtableApiKeyInput.value) {
            airtableApiKeyInput.value = response.airtableApiKey;
          }
          if (response.syncInterval && !syncIntervalSelect.value) {
            syncIntervalSelect.value = response.syncInterval.toString();
          }
        }
      });
    });
  }
  
  // Function to load sync status
  function loadSyncStatus() {
    chrome.runtime.sendMessage({ action: 'getSyncStatus' }, (response) => {
      console.log('Sync status from background:', response);
      if (response && response.syncStatus) {
        updateSyncStatusUI(response.syncStatus);
      }
    });
    
    // Also check local storage for sync status
    chrome.storage.local.get(['syncStatus'], (result) => {
      console.log('Sync status from storage:', result);
      if (result.syncStatus) {
        updateSyncStatusUI(result.syncStatus);
      }
    });
  }
  
  // Function to update sync status UI
  function updateSyncStatusUI(syncStatus) {
    // Update status dot and text
    syncDot.className = 'sync-dot';
    if (syncStatus.status) {
      syncDot.classList.add(syncStatus.status);
    }
    
    syncStatusText.textContent = syncStatus.message || 'Unknown';
    
    // Update last sync time
    if (syncStatus.lastSync) {
      const lastSyncDate = new Date(syncStatus.lastSync);
      lastSyncTime.textContent = `Last sync: ${lastSyncDate.toLocaleString()}`;
    } else {
      lastSyncTime.textContent = 'Never synced';
    }
    
    // Update data count
    if (syncStatus.dataCount > 0) {
      syncDataCount.textContent = `${syncStatus.dataCount} entries loaded`;
    } else {
      syncDataCount.textContent = 'No data';
    }
  }
  
  // Function to trigger sync now
  function syncNow() {
    // Update UI to show syncing
    syncDot.className = 'sync-dot syncing';
    syncStatusText.textContent = 'Syncing...';
    
    // Send message to background script
    chrome.runtime.sendMessage({ action: 'syncData' }, (response) => {
      console.log('Sync response:', response);
      
      // Wait a moment for the sync to complete
      setTimeout(() => {
        loadSyncStatus();
      }, 1000);
    });
  }
  
  // Function to save settings to storage
  function saveSettings() {
    // Get values from form
    const airtableUrl = airtableUrlInput.value.trim();
    const airtableApiKey = airtableApiKeyInput.value.trim();
    const syncInterval = parseInt(syncIntervalSelect.value, 10);
    
    console.log('Saving settings:', { 
      airtableUrl, 
      airtableApiKey: airtableApiKey ? '[REDACTED]' : '', 
      syncInterval 
    });
    
    // Validate API key (required)
    if (!airtableApiKey) {
      showStatus('Please enter your Airtable API key', 'error');
      airtableApiKeyInput.focus();
      return;
    }
    
    // Validate Airtable URL or Base ID
    if (!airtableUrl) {
      showStatus('Please enter an Airtable Base ID or URL', 'error');
      airtableUrlInput.focus();
      return;
    }
    
    // Basic validation - either a Base ID or a valid URL
    if (!isValidAirtableInput(airtableUrl)) {
      showStatus('Please enter a valid Airtable Base ID or URL', 'error');
      airtableUrlInput.focus();
      return;
    }
    
    // Save settings to storage
    chrome.storage.sync.set({
      airtableUrl,
      airtableApiKey,
      syncInterval
    }, () => {
      // Show success message
      showStatus('Settings saved successfully!', 'success');
      
      // Trigger data sync in background script
      syncNow();
    });
  }
  
  // Function to validate Airtable input format
  function isValidAirtableInput(input) {
    // Check if it's a Base ID (starts with "app")
    if (input.startsWith('app')) {
      return true;
    }
    
    // Or check if it's a valid Airtable URL
    return input.startsWith('https://airtable.com/') && input.includes('/');
  }
  
  // Function to show status message
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
    }, 3000);
  }
});
