// Function to check if URL matches pattern
function urlMatchesPattern(url, pattern) {
  console.log(`Checking if URL ${url} matches pattern ${pattern}`);
  
  // Extract hostname from URL if it's a full URL
  let hostname = url;
  try {
    if (url.startsWith('http')) {
      hostname = new URL(url).hostname;
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  
  // If pattern contains wildcard (*), convert to regex
  if (pattern.includes('*')) {
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(regexPattern, 'i'); // Case insensitive
    const result = regex.test(url);
    console.log(`Regex match (${regexPattern}): ${result}`);
    return result;
  }
  
  // Check if hostname contains the pattern (case insensitive)
  const hostnameMatch = hostname.toLowerCase().includes(pattern.toLowerCase());
  
  // Check if full URL contains the pattern (case insensitive)
  const urlMatch = url.toLowerCase().includes(pattern.toLowerCase());
  
  console.log(`Hostname match: ${hostnameMatch}, URL match: ${urlMatch}`);
  return hostnameMatch || urlMatch;
}

// Function to count matching entries
function countMatchingEntries(url, data) {
  return data.filter(entry => urlMatchesPattern(url, entry.address)).length;
}

// Function to create warning banner
function createWarningBanner(matchingEntries) {
  // Create banner container
  const banner = document.createElement('div');
  banner.id = 'trusttag-banner';
  banner.className = 'trusttag-banner';
  
  // Create content container
  const content = document.createElement('div');
  content.className = 'trusttag-content';
  
  // Create warning icon with counter
  const iconContainer = document.createElement('div');
  iconContainer.className = 'trusttag-icon-container';
  
  const icon = document.createElement('span');
  icon.className = 'trusttag-icon';
  icon.textContent = '⚠️';
  
  // Add counter badge
  const counter = document.createElement('span');
  counter.className = 'trusttag-counter';
  counter.textContent = matchingEntries.length;
  
  iconContainer.appendChild(icon);
  iconContainer.appendChild(counter);
  
  // Create warning text
  const text = document.createElement('div');
  text.className = 'trusttag-text';
  
  // Create title
  const title = document.createElement('div');
  title.className = 'trusttag-title';
  title.textContent = `TrustTag Warning`;
  
  // Create subtitle with count
  const subtitle = document.createElement('div');
  subtitle.className = 'trusttag-subtitle';
  subtitle.textContent = `${matchingEntries.length} ${matchingEntries.length === 1 ? 'warning' : 'warnings'} for this site`;
  
  // Create remarks container
  const remarksContainer = document.createElement('div');
  remarksContainer.className = 'trusttag-remarks';
  
  // Create array of remark elements
  const remarkElements = matchingEntries.map((entry, index) => {
    const remarkSpan = document.createElement('span');
    remarkSpan.textContent = entry.shortRemark;
    remarkSpan.title = entry.noteText;
    remarkSpan.className = 'trusttag-remark';
    remarkSpan.addEventListener('click', () => {
      // Show full note text in a popup
      alert(`${entry.noteText}\n\nSource: ${entry.source}`);
    });
    return remarkSpan;
  });
  
  // Add remarks with comma separators
  remarkElements.forEach((remarkElement, index) => {
    remarksContainer.appendChild(remarkElement);
    
    // Add comma and space after each remark except the last one
    if (index < remarkElements.length - 1) {
      const comma = document.createTextNode(', ');
      remarksContainer.appendChild(comma);
    }
  });
  
  // Create close button
  const closeButton = document.createElement('button');
  closeButton.className = 'trusttag-close';
  closeButton.textContent = '×';
  closeButton.title = 'Close';
  closeButton.addEventListener('click', () => {
    banner.style.display = 'none';
  });
  
  // Assemble banner
  text.appendChild(title);
  text.appendChild(subtitle);
  text.appendChild(remarksContainer);
  content.appendChild(iconContainer);
  content.appendChild(text);
  banner.appendChild(content);
  banner.appendChild(closeButton);
  
  return banner;
}

// Main function to check current page
function checkCurrentPage() {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  
  console.log('TrustTag: Checking current page', { currentUrl, hostname });
  
  // Get data from storage
  chrome.storage.local.get(['trustTagData', 'syncStatus'], (result) => {
    if (!result.trustTagData) {
      console.log('No TrustTag data available');
      return;
    }
    
    console.log('TrustTag data:', result.trustTagData);
    console.log('Sync status:', result.syncStatus);
    
    const data = result.trustTagData;
    
    // Find matching entries
    const matchingEntries = data.filter(entry => {
      if (!entry.address) return false;
      return urlMatchesPattern(currentUrl, entry.address) || 
             urlMatchesPattern(hostname, entry.address);
    });
    
    console.log('Matching entries:', matchingEntries);
    
    // If there are matching entries, display warning
    if (matchingEntries.length > 0) {
      // Check if banner already exists
      let banner = document.getElementById('trusttag-banner');
      
      if (banner) {
        // Update existing banner
        banner.remove();
      }
      
      // Create new banner
      banner = createWarningBanner(matchingEntries);
      
      // Add banner to page
      document.body.insertBefore(banner, document.body.firstChild);
      console.log('TrustTag banner added to page');
    } else {
      console.log('No matching entries found for this URL');
    }
  });
}

// Run when page loads
window.addEventListener('load', checkCurrentPage);

// Also run when URL changes (for single-page applications)
let lastUrl = window.location.href;
new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    checkCurrentPage();
  }
}).observe(document, { subtree: true, childList: true });
