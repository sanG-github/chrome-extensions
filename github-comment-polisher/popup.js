// DOM elements
const apiProviderSelect = document.getElementById('api-provider');
const apiKeyInput = document.getElementById('api-key');
const apiEndpointInput = document.getElementById('api-endpoint');
const toggleVisibilityButton = document.getElementById('toggle-visibility');
const saveButton = document.getElementById('save-button');
const resetButton = document.getElementById('reset-button');
const statusDiv = document.getElementById('status');
const customGuidelinesTextarea = document.getElementById('custom-guidelines');
const saveGuidelinesButton = document.getElementById('save-guidelines-button');

// Default endpoints for different providers
const DEFAULT_ENDPOINTS = {
  'deepseek': 'https://api.deepseek.com/v1/chat/completions',
  'openai': 'https://api.openai.com/v1/chat/completions'
};

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', loadSettings);

// Add event listeners
apiProviderSelect.addEventListener('change', updateEndpointPlaceholder);
toggleVisibilityButton.addEventListener('click', togglePasswordVisibility);
saveButton.addEventListener('click', saveSettings);
resetButton.addEventListener('click', resetSettings);
saveGuidelinesButton.addEventListener('click', saveCustomGuidelines);

// Toggle password visibility
function togglePasswordVisibility() {
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleVisibilityButton.innerHTML = '&#128274;'; // Lock emoji
  } else {
    apiKeyInput.type = 'password';
    toggleVisibilityButton.innerHTML = '&#128065;'; // Eye emoji
  }
}

// Update API endpoint placeholder based on selected provider
function updateEndpointPlaceholder() {
  const provider = apiProviderSelect.value;
  apiEndpointInput.placeholder = DEFAULT_ENDPOINTS[provider] || 'Custom API endpoint URL';
}

// Load saved settings
function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'apiProvider', 'customGuidelines'], (data) => {
    if (data.apiProvider) {
      apiProviderSelect.value = data.apiProvider;
    }
    
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    
    if (data.apiEndpoint) {
      apiEndpointInput.value = data.apiEndpoint;
    }
    
    if (data.customGuidelines) {
      customGuidelinesTextarea.value = data.customGuidelines;
    }
    
    updateEndpointPlaceholder();
  });
}

// Save settings
function saveSettings() {
  const apiProvider = apiProviderSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const apiEndpoint = apiEndpointInput.value.trim() || DEFAULT_ENDPOINTS[apiProvider];
  
  if (!apiKey) {
    showStatus('Please enter an API key.', 'error');
    return;
  }
  
  chrome.storage.sync.set({
    apiProvider,
    apiKey,
    apiEndpoint
  }, () => {
    showStatus('Settings saved successfully!', 'success');
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
      statusDiv.textContent = '';
    }, 3000);
  });
}

// Save custom guidelines
function saveCustomGuidelines() {
  const guidelines = customGuidelinesTextarea.value.trim();
  
  chrome.storage.sync.set({
    customGuidelines: guidelines
  }, () => {
    showStatus('Custom guidelines saved successfully!', 'success');
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
      statusDiv.textContent = '';
    }, 3000);
  });
}

// Reset settings
function resetSettings() {
  apiProviderSelect.value = 'deepseek';
  apiKeyInput.value = '';
  apiEndpointInput.value = '';
  customGuidelinesTextarea.value = '';
  updateEndpointPlaceholder();
  
  chrome.storage.sync.remove(['apiKey', 'apiEndpoint', 'apiProvider', 'customGuidelines'], () => {
    showStatus('Settings reset successfully!', 'success');
    
    // Clear status after 3 seconds
    setTimeout(() => {
      statusDiv.className = 'status';
      statusDiv.textContent = '';
    }, 3000);
  });
}

// Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
} 