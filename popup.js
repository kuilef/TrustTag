// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get references to form elements
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
    chrome.storage.sync.get(['syncInterval'], (result) => {
      console.log('Loading settings from storage:', result);
      
      if (result.syncInterval) {
        syncIntervalSelect.value = result.syncInterval.toString();
      }
      
      // Also check with background script for current values
      chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
        console.log('Current config from background:', response);
        if (response && response.syncInterval && !syncIntervalSelect.value) {
          syncIntervalSelect.value = response.syncInterval.toString();
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
    const syncInterval = parseInt(syncIntervalSelect.value, 10);
    
    console.log('Saving settings:', { syncInterval });
    
    // Save settings to storage
    chrome.storage.sync.set({
      syncInterval
    }, () => {
      // Show success message
      showStatus('Settings saved successfully!', 'success');
      
      // Trigger data sync in background script
      syncNow();
    });
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
