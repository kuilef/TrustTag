// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get references to form elements
  const syncIntervalSelect = document.getElementById('syncInterval');
  const saveButton = document.getElementById('saveButton');
  const statusDiv = document.getElementById('status');
  const syncNowButton = document.getElementById('syncNowButton');
  const dataSourcesContainer = document.getElementById('dataSources');
  const newSourceUrlInput = document.getElementById('newSourceUrl');
  const newSourceNameInput = document.getElementById('newSourceName');
  const addSourceButton = document.getElementById('addSourceButton');
  
  // Get references to sync status elements
  const syncDot = document.querySelector('.sync-dot');
  const syncStatusText = document.getElementById('syncStatusText');
  const lastSyncTime = document.getElementById('lastSyncTime');
  const syncDataCount = document.getElementById('syncDataCount');
  
  // Data sources array
  let dataSources = [];
  
  // Load saved settings
  loadSettings();
  
  // Load sync status
  loadSyncStatus();
  
  // Add event listeners
  saveButton.addEventListener('click', saveSettings);
  syncNowButton.addEventListener('click', syncNow);
  addSourceButton.addEventListener('click', addDataSource);
  
  // Function to load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['syncInterval', 'dataSources'], (result) => {
      console.log('Loading settings from storage:', result);
      
      if (result.syncInterval) {
        syncIntervalSelect.value = result.syncInterval.toString();
      }
      
      // Also check with background script for current values
      chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
        console.log('Current config from background:', response);
        if (response) {
          if (response.syncInterval && !syncIntervalSelect.value) {
            syncIntervalSelect.value = response.syncInterval.toString();
          }
          
          if (response.dataSources) {
            dataSources = response.dataSources;
            renderDataSources();
          }
        }
      });
    });
  }
  
  // Function to load sync status
  function loadSyncStatus() {
    // First check local storage for sync status
    chrome.storage.local.get(['syncStatus', 'trustTagData'], (result) => {
      console.log('Sync status from storage:', result);
      
      // If we have sync status in storage, use it
      if (result.syncStatus) {
        updateSyncStatusUI(result.syncStatus);
        
        // If we have data but sync status doesn't show it, update the data count
        if (result.trustTagData && result.trustTagData.length > 0 && 
            (!result.syncStatus.dataCount || result.syncStatus.dataCount === 0)) {
          const updatedStatus = {...result.syncStatus};
          updatedStatus.dataCount = result.trustTagData.length;
          if (updatedStatus.status === 'unknown') {
            updatedStatus.status = 'success';
            updatedStatus.message = 'Data loaded from storage';
          }
          updateSyncStatusUI(updatedStatus);
        }
      }
      
      // Then also check with background script for possibly more up-to-date status
      chrome.runtime.sendMessage({ action: 'getSyncStatus' }, (response) => {
        console.log('Sync status from background:', response);
        if (response && response.syncStatus) {
          // Only update if the background has a more recent sync time
          const bgSyncTime = response.syncStatus.lastSync ? new Date(response.syncStatus.lastSync) : null;
          const storageSyncTime = result.syncStatus && result.syncStatus.lastSync ? 
                                  new Date(result.syncStatus.lastSync) : null;
          
          if (!storageSyncTime || !bgSyncTime || bgSyncTime >= storageSyncTime) {
            updateSyncStatusUI(response.syncStatus);
          }
        }
      });
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
  
  // Function to render data sources list
  function renderDataSources() {
    // Clear container
    dataSourcesContainer.innerHTML = '';
    
    // Check if there are any data sources
    if (dataSources.length === 0) {
      dataSourcesContainer.innerHTML = '<div class="empty-list">No data sources added</div>';
      return;
    }
    
    // Create elements for each data source
    dataSources.forEach((source, index) => {
      const sourceItem = document.createElement('div');
      sourceItem.className = 'data-source-item';
      
      // Source info
      const sourceInfo = document.createElement('div');
      sourceInfo.className = 'data-source-info';
      
      const sourceName = document.createElement('div');
      sourceName.className = 'data-source-name';
      sourceName.textContent = source.name;
      
      const sourceUrl = document.createElement('div');
      sourceUrl.className = 'data-source-url';
      sourceUrl.textContent = source.url;
      
      sourceInfo.appendChild(sourceName);
      sourceInfo.appendChild(sourceUrl);
      
      // Source controls
      const sourceControls = document.createElement('div');
      sourceControls.className = 'data-source-controls';
      
      // Toggle switch
      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'toggle-switch';
      
      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = source.enabled;
      toggleInput.addEventListener('change', () => toggleDataSource(source.url, toggleInput.checked));
      
      const toggleSlider = document.createElement('span');
      toggleSlider.className = 'toggle-slider';
      
      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(toggleSlider);
      
      // Remove button
      const removeButton = document.createElement('button');
      removeButton.className = 'remove-source';
      removeButton.innerHTML = '&times;';
      removeButton.title = 'Remove data source';
      removeButton.addEventListener('click', () => removeDataSource(source.url));
      
      // Don't allow removing the last data source
      if (dataSources.length === 1) {
        removeButton.disabled = true;
        removeButton.title = 'Cannot remove the only data source';
        removeButton.style.opacity = '0.5';
        removeButton.style.cursor = 'not-allowed';
      }
      
      sourceControls.appendChild(toggleLabel);
      sourceControls.appendChild(removeButton);
      
      // Assemble item
      sourceItem.appendChild(sourceInfo);
      sourceItem.appendChild(sourceControls);
      
      dataSourcesContainer.appendChild(sourceItem);
    });
  }
  
  // Function to add a new data source
  function addDataSource() {
    const url = newSourceUrlInput.value.trim();
    const name = newSourceNameInput.value.trim() || url;
    
    if (!url) {
      showStatus('Please enter a URL for the data source', 'error');
      newSourceUrlInput.focus();
      return;
    }
    
    // Basic URL validation
    if (!isValidUrl(url)) {
      showStatus('Please enter a valid URL', 'error');
      newSourceUrlInput.focus();
      return;
    }
    
    // Check if source already exists
    const exists = dataSources.some(source => source.url === url);
    if (exists) {
      showStatus('This data source already exists', 'error');
      return;
    }
    
    // Send message to background script to add the source
    chrome.runtime.sendMessage({
      action: 'addDataSource',
      data: { url, name }
    }, (response) => {
      if (response && response.success) {
        // Update local data sources
        dataSources = response.dataSources;
        
        // Clear inputs
        newSourceUrlInput.value = '';
        newSourceNameInput.value = '';
        
        // Re-render data sources
        renderDataSources();
        
        showStatus('Data source added successfully', 'success');
      } else {
        showStatus('Failed to add data source', 'error');
      }
    });
  }
  
  // Function to remove a data source
  function removeDataSource(url) {
    // Don't allow removing the last data source
    if (dataSources.length <= 1) {
      showStatus('Cannot remove the only data source', 'error');
      return;
    }
    
    // Confirm removal
    if (!confirm(`Are you sure you want to remove the data source "${url}"?`)) {
      return;
    }
    
    // Send message to background script to remove the source
    chrome.runtime.sendMessage({
      action: 'removeDataSource',
      data: { url }
    }, (response) => {
      if (response && response.success) {
        // Update local data sources
        dataSources = response.dataSources;
        
        // Re-render data sources
        renderDataSources();
        
        showStatus('Data source removed successfully', 'success');
      } else {
        showStatus('Failed to remove data source', 'error');
      }
    });
  }
  
  // Function to toggle a data source
  function toggleDataSource(url, enabled) {
    // Send message to background script to toggle the source
    chrome.runtime.sendMessage({
      action: 'toggleDataSource',
      data: { url, enabled }
    }, (response) => {
      if (response && response.success) {
        // Update local data sources
        dataSources = response.dataSources;
        
        // Re-render data sources
        renderDataSources();
        
        showStatus(`Data source ${enabled ? 'enabled' : 'disabled'} successfully`, 'success');
      } else {
        showStatus(`Failed to ${enabled ? 'enable' : 'disable'} data source`, 'error');
      }
    });
  }
  
  // Function to validate URL
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
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
