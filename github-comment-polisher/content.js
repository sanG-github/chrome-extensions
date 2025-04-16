// Comment types for different contexts
const COMMENT_TYPES = {
  REVIEW: 'review',
  RESPONSE: 'response',
  APPROVAL: 'approval'
};

// For debugging
console.log('GitHub Comment Polisher extension loaded!');

// Icon sets for different comment intents
const ICON_SETS = {
  positive: ["🎉", "✨", "👏"],
  suggestion: ["💡", "🤔"],
  question: ["❓", "🔍"],
  minor: ["🔧", "📝"],
  preApproval: ["✅", "⭐"],
  acknowledgment: ["👍", "🙌"]
};

// Store original comments for rollback
const originalComments = new Map();

// Debounce function to prevent excessive function calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add standalone "Polish message" button to GitHub's interface
function addStandalonePolishButtons() {
  console.log('Attempting to add standalone polish buttons');
  
  // Check if API key is configured
  chrome.storage.sync.get(['apiKey'], (data) => {
    // For debugging, use a dummy API key if none exists
    if (!data.apiKey) {
      console.log('No API key found, using debug mode for visibility testing');
      // Instead of notification, continue with normal button for debugging
    }
    
    // Use every possible container selector GitHub might have to ensure we catch them all
    const reviewButtonContainers = document.querySelectorAll(
      '.form-actions, .inline-comment-form-actions, ' + 
      '.review-simple-reply-container, .new-discussion-timeline, ' +
      '.timeline-comment-actions, .js-comment-container');
    console.log('Found button containers:', reviewButtonContainers.length);
    
    reviewButtonContainers.forEach((container, index) => {
      console.log(`Container ${index} HTML:`, container.outerHTML.substring(0, 150) + '...');
      
      // Skip if we already added a button to this container
      if (container.querySelector('.standalone-polish-btn')) {
        console.log(`Container ${index} already has a polish button`);
        return;
      }
      
      // Log all form elements and text areas to help debugging
      const forms = container.closest('form') || container.querySelector('form');
      console.log(`Container ${index} has form:`, !!forms);
      
      // Try multiple strategies to find text areas
      const directTextArea = container.querySelector('.comment-form-textarea');
      const formTextArea = forms ? forms.querySelector('.comment-form-textarea') : null;
      const anyTextArea = document.querySelector('.comment-form-textarea');
      
      console.log(`Container ${index} text areas:`, {
        directTextArea: !!directTextArea,
        formTextArea: !!formTextArea,
        anyTextAreaExists: !!anyTextArea
      });
      
      // Find the input field with maximum flexibility
      const commentField = directTextArea || formTextArea || 
                          container.querySelector('textarea') ||
                          (forms ? forms.querySelector('textarea') : null);
      
      if (!commentField) {
        console.log(`No comment field found for container ${index}`);
        return;
      } else {
        console.log(`Found comment field for container ${index}:`, commentField.className);
      }
      
      // Create a much more visible button for debugging
      console.log(`Creating button for container ${index}`);
      
      const standaloneButton = document.createElement('button');
      standaloneButton.type = 'button'; // Prevent form submission
      standaloneButton.className = 'standalone-polish-btn btn btn-sm';
      standaloneButton.innerHTML = '✨ Polish message';
      standaloneButton.style.marginRight = '8px';
      standaloneButton.style.backgroundColor = '#2ea44f';
      standaloneButton.style.color = 'white';
      standaloneButton.style.fontWeight = 'bold';
      standaloneButton.style.padding = '6px 12px';
      standaloneButton.style.border = '1px solid rgba(27, 31, 35, 0.15)';
      standaloneButton.style.borderRadius = '6px';
      standaloneButton.style.cursor = 'pointer';
      
      // Add visual debugging to see if button is being created but hidden
      console.log('Button created with styles:', standaloneButton.outerHTML);
      
      // Add click handler
      standaloneButton.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Polish button clicked');
        console.log('Comment field value:', commentField.value);
        
        const comment = commentField.value;
        if (!comment.trim()) {
          alert('Please enter a comment before polishing.');
          return;
        }
        
        // Determine comment type based on context
        let commentType = COMMENT_TYPES.REVIEW;
        
        // Check for response context
        if (container.closest('.js-comment')) {
          commentType = COMMENT_TYPES.RESPONSE;
        }
        
        // Try alternative insertion strategies
        if (container.querySelector('button[type="submit"]')) {
          // If there's a submit button, insert before it
          container.insertBefore(standaloneButton, container.querySelector('button[type="submit"]'));
        } else {
          // Otherwise try prepending to container
          container.insertBefore(standaloneButton, container.firstChild);
        }
        
        // Polish the comment
        polishComment(commentField, comment, commentType);
      });
      
      try {
        // Insert at the beginning of the container for better visibility
        container.insertBefore(standaloneButton, container.firstChild);
        console.log('Button inserted into DOM at position:', Array.from(container.children).indexOf(standaloneButton));
        
        // Add alternative placement
        if (commentField && commentField.parentElement) {
          const alternativeButton = standaloneButton.cloneNode(true);
          alternativeButton.style.position = 'absolute';
          alternativeButton.style.top = '10px';
          alternativeButton.style.right = '10px';
          alternativeButton.style.zIndex = '9999';
          commentField.parentElement.style.position = 'relative';
          commentField.parentElement.appendChild(alternativeButton);
          console.log('Added alternative button placement');
        }
      } catch (error) {
        console.error('Error inserting button:', error);
      }
    });
  });
}

// Add notification button when API key is missing
function addNotificationButton() {
  // Find buttons across GitHub's interface
  const buttonContainers = document.querySelectorAll('.form-actions, .inline-comment-form-actions, .review-simple-reply-container');
  
  buttonContainers.forEach((container, index) => {
    // Skip if we already added a notification button to this container
    if (container.querySelector('.polish-notification-btn')) return;
    
    // Create notification button
    const notificationButton = document.createElement('button');
    notificationButton.type = 'button';
    notificationButton.className = 'standalone-polish-btn polish-notification-btn btn btn-sm btn-primary';
    notificationButton.innerHTML = '⚠️ Configure Polish';
    notificationButton.style.marginRight = '8px';
    
    // Add click handler to open extension settings
    notificationButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show a modal explaining how to set up the API key
      showAPIKeySetupModal();
    });
    
    // Insert at the beginning of the container for better visibility
    container.insertBefore(notificationButton, container.firstChild);
  });
}

// Show modal explaining how to set up API key
function showAPIKeySetupModal() {
  // Create modal content
  const modal = document.createElement('div');
  modal.className = 'polish-modal';
  modal.innerHTML = `
    <div class="polish-modal-content">
      <h3>API Key Required</h3>
      <p>To use the GitHub Comment Polisher, you need to configure an API key.</p>
      <ol>
        <li>Click on the extension icon in your browser toolbar</li>
        <li>Select an API provider (DeepSeek or OpenAI)</li>
        <li>Enter your API key for the selected provider</li>
        <li>Click "Save Settings"</li>
      </ol>
      <p>After setting up your API key, reload this page to activate the polish feature.</p>
      <div class="polish-modal-actions">
        <button id="polish-modal-close" class="btn btn-sm">Close</button>
      </div>
    </div>
  `;
  
  // Add styles
  const styles = document.createElement('style');
  styles.textContent = `
    .polish-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .polish-modal-content {
      background: white;
      border-radius: 6px;
      padding: 24px;
      max-width: 500px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .polish-modal-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  `;
  
  document.body.appendChild(styles);
  document.body.appendChild(modal);
  
  // Add event listener for close button
  document.getElementById('polish-modal-close').addEventListener('click', () => {
    modal.remove();
    styles.remove();
  });
}

// Find the closest text area related to a container
function findClosestTextArea(container) {
  // First try to find a text area within the container
  const textArea = container.querySelector('.comment-form-textarea');
  if (textArea) return textArea;
  
  // If not found, search up the DOM tree
  let parent = container.parentElement;
  while (parent) {
    const textArea = parent.querySelector('.comment-form-textarea');
    if (textArea) return textArea;
    parent = parent.parentElement;
  }
  
  return null;
}

// Handle review buttons
function handleReviewButtons() {
  // Find all buttons by their labels rather than using :contains
  // This is more compatible with standard DOM APIs
  try {
    const allButtons = document.querySelectorAll('button');
    const reviewButtons = Array.from(allButtons).filter(button => {
      // Check button text content
      const text = button.textContent.trim().toLowerCase();
      return (
        text.includes('start a review') || 
        text.includes('add review comment') || 
        text.includes('add single comment') || 
        button.hasAttribute('data-disable-with')
      );
    });
    
    reviewButtons.forEach(button => {
      // Skip if already processed
      if (button.dataset.polishHandled) return;
      button.dataset.polishHandled = 'true';
      
      // Store original click handler
      const originalClickHandler = button.onclick;
      
      // Replace with our handler
      button.onclick = async function(e) {
        // Find the associated comment field
        const commentContainer = findClosestCommentContainer(button);
        if (!commentContainer) {
          // If we can't find the comment field, just use the original handler
          if (originalClickHandler) return originalClickHandler.call(this, e);
          return true;
        }
        
        const commentField = commentContainer.querySelector('.comment-form-textarea');
        if (!commentField || !commentField.value.trim()) {
          // If no comment or empty comment, use original handler
          if (originalClickHandler) return originalClickHandler.call(this, e);
          return true;
        }
        
        // Show polishing confirmation
        const shouldPolish = await showPolishConfirmation(commentField);
        if (!shouldPolish) {
          // User declined polishing, use original handler
          if (originalClickHandler) return originalClickHandler.call(this, e);
          return true;
        }
        
        // Prevent default form submission
        e.preventDefault();
        e.stopPropagation();
        
        // Polish the comment then submit the form
        await polishComment(commentField, commentField.value, 'review', () => {
          // After polishing, trigger the original handler
          if (originalClickHandler) originalClickHandler.call(this, e);
          else button.click(); // Simple click if no handler
        });
        
        return false;
      };
    });
  } catch (error) {
    console.error('Error handling review buttons:', error);
  }
}

// Find the closest comment container for a button
function findClosestCommentContainer(button) {
  // Try different parent selectors depending on GitHub's structure
  const possibleContainers = [
    button.closest('.js-inline-comment-form'),
    button.closest('.review-comment'),
    button.closest('.js-comment-container'),
    button.closest('form')
  ];
  
  return possibleContainers.find(container => container && container.querySelector('.comment-form-textarea'));
}

// Show confirmation dialog for polishing
function showPolishConfirmation(field) {
  return new Promise(resolve => {
    // Create confirmation dialog
    const dialog = document.createElement('div');
    dialog.className = 'polish-confirmation-dialog';
    dialog.innerHTML = `
      <div class="polish-confirmation-content">
        <h3>Polish your comment?</h3>
        <p>Would you like to polish your comment according to PR feedback guidelines?</p>
        <div class="polish-confirmation-buttons">
          <button class="btn btn-sm btn-outline" id="polish-decline">No, submit as is</button>
          <button class="btn btn-sm btn-primary" id="polish-accept">Yes, polish my comment</button>
        </div>
      </div>
    `;
    
    // Style the dialog
    const styles = document.createElement('style');
    styles.textContent = `
      .polish-confirmation-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .polish-confirmation-content {
        background: white;
        border-radius: 6px;
        padding: 24px;
        max-width: 400px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      }
      .polish-confirmation-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
    `;
    
    document.body.appendChild(styles);
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('polish-decline').addEventListener('click', () => {
      dialog.remove();
      styles.remove();
      resolve(false);
    });
    
    document.getElementById('polish-accept').addEventListener('click', () => {
      dialog.remove();
      styles.remove();
      resolve(true);
    });
  });
}

// Polish comment and show progress
async function polishComment(field, comment, commentType, callback) {
  console.log('Polishing comment:', comment.substring(0, 20) + '...');
  
  // Store original comment for potential rollback
  const fieldId = Date.now().toString();
  field.dataset.polishId = fieldId;
  originalComments.set(fieldId, comment);
  
  // Create progress indicator
  const progressElement = createProgressIndicator(field);
  field.parentElement.insertBefore(progressElement, field.nextSibling);
  
  // Disable the field while processing
  field.disabled = true;
  
  try {
    // Show progress animation
    updateProgress(progressElement, 'processing');
    
    // Send to background script for AI processing
    console.log('Sending message to background script');
    
    // Check if chrome.runtime is available
    if (!chrome.runtime) {
      throw new Error('Chrome runtime not available. Is this extension properly installed?');
    }
    
    const response = await chrome.runtime.sendMessage({
      action: 'polishComment',
      comment: comment,
      commentType: commentType
    });
    
    console.log('Received response:', response);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // Clean the polished comment - remove unwanted text
    let polishedComment = response.polishedComment;
    
    // Remove explanatory text like "Here's a polished version of your comment:"
    polishedComment = polishedComment.replace(/^(Here's a polished version( of your comment)?:|I've polished your comment:|Polished comment:).*?\n/i, '');
    
    // Remove any other explanations at the beginning
    polishedComment = polishedComment.replace(/^(I've made the following changes:|Changes made:|This version:).*?\n/i, '');
    
    // Trim any extra whitespace
    polishedComment = polishedComment.trim();
    
    console.log('Cleaned response:', polishedComment);
    
    // Update comment field with polished version
    field.value = polishedComment;
    field.style.backgroundColor = '#f0fff4';
    setTimeout(() => {
      field.style.backgroundColor = '';
    }, 2000);
    
    // Show success
    updateProgress(progressElement, 'success');
    
    // Add rollback/retry controls
    addActionControls(field, progressElement, fieldId, commentType);
    
    // Execute callback if provided (e.g., to submit the form)
    if (typeof callback === 'function') {
      setTimeout(callback, 1500); // Give user a moment to see the success state
    }
  } catch (error) {
    console.error('Error polishing comment:', error);
    updateProgress(progressElement, 'error', error.message);
    
    // Add retry button
    const retryButton = document.createElement('button');
    retryButton.className = 'btn btn-sm btn-danger';
    retryButton.textContent = 'Retry';
    retryButton.onclick = () => {
      progressElement.remove();
      polishComment(field, comment, commentType, callback);
    };
    progressElement.querySelector('.polish-progress-actions').appendChild(retryButton);
  } finally {
    // Re-enable the field
    field.disabled = false;
  }
}

// Create progress indicator element
function createProgressIndicator(field) {
  const container = document.createElement('div');
  container.className = 'polish-progress-container';
  container.innerHTML = `
    <div class="polish-progress-status">
      <div class="polish-progress-spinner"></div>
      <span class="polish-progress-text">Polishing comment...</span>
    </div>
    <div class="polish-progress-actions"></div>
  `;
  
  // Add styles if not already added
  if (!document.getElementById('polish-progress-styles')) {
    const styles = document.createElement('style');
    styles.id = 'polish-progress-styles';
    styles.textContent = `
      .polish-progress-container {
        margin: 8px 0;
        padding: 8px;
        border-radius: 6px;
        background: #f6f8fa;
        font-size: 14px;
      }
      .polish-progress-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .polish-progress-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0,0,0,0.1);
        border-top-color: #0366d6;
        border-radius: 50%;
        animation: polish-spin 1s linear infinite;
      }
      .polish-progress-actions {
        margin-top: 8px;
        display: flex;
        gap: 8px;
      }
      @keyframes polish-spin {
        to { transform: rotate(360deg); }
      }
      .polish-progress-success .polish-progress-spinner {
        border: none;
        animation: none;
        position: relative;
      }
      .polish-progress-success .polish-progress-spinner:before {
        content: '✓';
        color: #2ea44f;
        font-weight: bold;
      }
      .polish-progress-error .polish-progress-spinner {
        border: none;
        animation: none;
        position: relative;
      }
      .polish-progress-error .polish-progress-spinner:before {
        content: '✗';
        color: #cb2431;
        font-weight: bold;
      }
      .polish-message-btn {
        background-color: #2ea44f !important;
        color: white !important;
        border: 1px solid rgba(27, 31, 35, 0.15) !important;
        border-radius: 6px !important;
        padding: 5px 10px !important;
        cursor: pointer !important;
        margin-top: 8px !important;
        margin-bottom: 8px !important;
        display: block !important;
      }
    `;
    document.head.appendChild(styles);
  }
  
  return container;
}

// Update progress indicator state
function updateProgress(element, state, message) {
  const spinner = element.querySelector('.polish-progress-spinner');
  const text = element.querySelector('.polish-progress-text');
  
  // Remove previous state classes
  element.classList.remove('polish-progress-processing', 'polish-progress-success', 'polish-progress-error');
  
  // Add appropriate state class
  element.classList.add(`polish-progress-${state}`);
  
  // Update text based on state
  switch (state) {
    case 'processing':
      text.textContent = 'Polishing comment...';
      break;
    case 'success':
      text.textContent = 'Comment polished successfully!';
      break;
    case 'error':
      text.textContent = message || 'Error polishing comment. Please try again.';
      break;
  }
}

// Add action controls for rollback/retry
function addActionControls(field, progressElement, fieldId, commentType) {
  const actionsContainer = progressElement.querySelector('.polish-progress-actions');
  
  // Rollback button
  const rollbackButton = document.createElement('button');
  rollbackButton.className = 'btn btn-sm';
  rollbackButton.textContent = 'Revert to Original';
  rollbackButton.onclick = () => {
    field.value = originalComments.get(fieldId);
    field.style.backgroundColor = '#fffbdd';
    setTimeout(() => {
      field.style.backgroundColor = '';
    }, 2000);
  };
  
  // Retry button
  const retryButton = document.createElement('button');
  retryButton.className = 'btn btn-sm';
  retryButton.textContent = 'Polish Again';
  retryButton.onclick = () => {
    progressElement.remove();
    polishComment(field, field.value, commentType);
  };
  
  // Add buttons to container
  actionsContainer.appendChild(rollbackButton);
  actionsContainer.appendChild(retryButton);
}

// Create and show processing overlay
function showProcessingOverlay(field) {
  // Check if overlay already exists
  if (document.getElementById('polish-overlay')) return;
  
  const overlay = document.createElement('div');
  overlay.id = 'polish-overlay';
  overlay.className = 'polish-processing-overlay';
  overlay.innerHTML = `
    <div class="polish-processing-content">
      <div class="polish-loading-spinner"></div>
      <p>Polishing your comment...</p>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

// Hide and remove processing overlay
function hideProcessingOverlay() {
  const overlay = document.getElementById('polish-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Add quick template buttons for common patterns
function addQuickTemplateButtons() {
  const commentFields = document.querySelectorAll('.comment-form-textarea');
  
  commentFields.forEach(field => {
    // Skip if template buttons already exist
    if (field.parentElement.querySelector('.quick-template-container')) return;
    
    // Create container for template buttons
    const container = document.createElement('div');
    container.className = 'quick-template-container';
    
    // Add template buttons
    const templates = [
      { icon: '💡', text: 'What do you think about...', template: '💡 What do you think about ' },
      { icon: '🔍', text: 'Have you considered...', template: '🔍 Have you considered ' },
      { icon: '⭐', text: 'Optional suggestion', template: '⭐ Optional: I think this may be a good idea, but it\'s not strictly required. ' },
      { icon: '👍', text: 'Good idea', template: '👍 Good idea. I will make that change.' },
      { icon: '🙌', text: 'Good catch', template: '🙌 Good catch, I missed that. Fixing it now.' }
    ];
    
    templates.forEach(template => {
      const button = document.createElement('button');
      button.className = 'quick-template-btn';
      button.innerHTML = `${template.icon} ${template.text}`;
      button.title = template.template;
      
      button.addEventListener('click', () => {
        // Insert template at cursor position or append to end
        insertAtCursor(field, template.template);
      });
      
      container.appendChild(button);
    });
    
    // Add container after comment field
    field.parentElement.insertBefore(container, field.nextSibling);
  });
}

// Helper function to insert text at cursor position
function insertAtCursor(field, text) {
  const startPos = field.selectionStart;
  const endPos = field.selectionEnd;
  const currentValue = field.value;
  
  field.value = currentValue.substring(0, startPos) + text + currentValue.substring(endPos);
  
  // Set cursor position after inserted text
  field.selectionStart = field.selectionEnd = startPos + text.length;
  field.focus();
}

// Add a visible debug indicator
function addDebugIndicator() {
  if (document.getElementById('gh-comment-polisher-debug')) {
    return; // Already exists
  }
  
  const debugIndicator = document.createElement('div');
  debugIndicator.style.position = 'fixed';
  debugIndicator.style.bottom = '10px';
  debugIndicator.style.right = '10px';
  debugIndicator.style.backgroundColor = 'rgba(46, 164, 79, 0.8)';
  debugIndicator.style.color = 'white';
  debugIndicator.style.padding = '5px 10px';
  debugIndicator.style.borderRadius = '5px';
  debugIndicator.style.zIndex = '9999';
  debugIndicator.style.fontSize = '12px';
  debugIndicator.textContent = 'Comment Polisher Active';
  debugIndicator.id = 'gh-comment-polisher-debug';
  
  document.body.appendChild(debugIndicator);
  
  // Make it clickable to force re-initialization
  debugIndicator.style.cursor = 'pointer';
  debugIndicator.title = 'Click to reinitialize polish buttons';
  debugIndicator.addEventListener('click', () => {
    console.log('Manual re-scan triggered');
    processCommentAreas();
  });
  
  // Update with API key status
  chrome.storage.sync.get(['apiKey', 'apiProvider'], (data) => {
    if (data.apiKey) {
      debugIndicator.textContent = `Comment Polisher Active (${data.apiProvider || 'default'})`;
    } else {
      debugIndicator.textContent = 'Comment Polisher: No API Key';
      debugIndicator.style.backgroundColor = 'rgba(203, 36, 49, 0.8)';
    }
  });
}

// Add a floating toolbar that's always visible
function addFloatingToolbar() {
  // No longer adding the floating toolbar
  return;
}

// Run when page loads and when DOM changes
function initialize() {
  console.log('Initializing GitHub Comment Polisher');
  
  try {
    // Only add the debug indicator if it doesn't exist yet
    if (!document.getElementById('gh-comment-polisher-debug')) {
      addDebugIndicator();
    }
    
    // Check API key status and display it in the indicator
    chrome.storage.sync.get(['apiKey', 'apiProvider'], (data) => {
      const debugIndicator = document.getElementById('gh-comment-polisher-debug');
      if (debugIndicator) {
        if (data.apiKey) {
          debugIndicator.textContent = `Comment Polisher Active (${data.apiProvider || 'default'})`;
          debugIndicator.style.backgroundColor = 'rgba(46, 164, 79, 0.8)'; // Green for success
        } else {
          debugIndicator.textContent = 'Comment Polisher: No API Key';
          debugIndicator.style.backgroundColor = 'rgba(203, 36, 49, 0.8)'; // Red for warning
        }
      }
    });
    
    // Process all text areas immediately
    processAllTextareas();
    
    // Set up global event listeners if not already done
    if (!window.polishListenersInitialized) {
      setupGlobalEventListeners();
      window.polishListenersInitialized = true;
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
}

// Process all text areas on the page
function processAllTextareas() {
  const allTextAreas = document.querySelectorAll('textarea');
  console.log(`Found ${allTextAreas.length} textareas in total`);
  
  allTextAreas.forEach((textarea, index) => {
    processTextarea(textarea, index);
  });
}

// Process a single textarea
function processTextarea(textarea, index) {
  console.log(`Processing textarea ${index || 'unknown'}:`, textarea.className);
  
  // Skip processing for non-comment textareas like search boxes
  if (textarea.id === 'js-command-bar-field' || 
      textarea.id === 'js-searchable-reference-filter-field' ||
      textarea.classList.contains('js-filterable-field')) {
    console.log(`Skipping non-comment textarea: ${textarea.id || textarea.className}`);
    return;
  }
  
  // Log the context to help debugging
  const isCommentBox = textarea.classList.contains('comment-form-textarea') || 
                      textarea.classList.contains('js-comment-field');
  const isNewComment = textarea.closest('.timeline-comment-wrapper') !== null;
  const isReplyComment = textarea.closest('.js-inline-comment-form') !== null;
  const isEditComment = textarea.closest('.js-comment.is-comment-editing') !== null;
  
  console.log(`Textarea context:`, { 
    isCommentBox, 
    isNewComment, 
    isReplyComment, 
    isEditComment,
    id: textarea.id || 'no-id',
    parent: textarea.parentElement?.className || 'no-parent',
    form: textarea.closest('form')?.className || 'no-form'
  });
  
  // Process each textarea only once
  if (!textarea.dataset.polishInitialized) {
    textarea.dataset.polishInitialized = 'true';
    
    // Create a button that's directly attached to the textarea for maximum compatibility
    const polishButton = document.createElement('button');
    polishButton.textContent = '✨ Polish Message';
    polishButton.className = 'polish-message-btn btn btn-sm';
    polishButton.type = 'button';  // Important! Prevents form submission
    polishButton.style.backgroundColor = '#2ea44f';
    polishButton.style.color = 'white';
    polishButton.style.border = '1px solid rgba(27, 31, 35, 0.15)';
    polishButton.style.borderRadius = '6px';
    polishButton.style.padding = '5px 10px';
    polishButton.style.cursor = 'pointer';
    polishButton.style.marginTop = '8px';
    polishButton.style.marginBottom = '8px';
    polishButton.style.display = 'block'; 
    
    // Add click handler
    polishButton.addEventListener('click', (e) => {
      // Only prevent default for our own action
      // Don't stop propagation so other handlers can work
      e.preventDefault();
      
      console.log(`Polish button clicked for textarea`);
      
      const comment = textarea.value;
      if (!comment.trim()) {
        alert('Please enter a comment before polishing.');
        return;
      }
      
      // Determine the most appropriate comment type based on context
      let commentType = COMMENT_TYPES.REVIEW;
      if (isReplyComment) {
        commentType = COMMENT_TYPES.RESPONSE;
      } else if (isEditComment) {
        commentType = COMMENT_TYPES.RESPONSE;
      }
      
      polishComment(textarea, comment, commentType);
    });
    
    // Insert the button directly after the textarea
    if (textarea.parentElement) {
      textarea.insertAdjacentElement('afterend', polishButton);
      console.log(`Added polish button directly after textarea`);
    }
  }
}

// Set up global event listeners for capturing dynamic textareas
function setupGlobalEventListeners() {
  console.log('Setting up global event listeners');
  
  // Listen for clicks on the whole document to catch buttons
  document.addEventListener('click', (e) => {
    // Skip processing for GitHub's own action buttons
    const target = e.target;
    
    // Check if it's a GitHub action button like Delete or Edit
    const isGitHubAction = 
      target.closest('.js-comment-delete-button') || 
      target.closest('.js-comment-edit-button') ||
      target.closest('[role="menuitem"]') ||
      (target.textContent && (
        target.textContent.trim() === 'Delete' || 
        target.textContent.trim() === 'Edit'
      ));
    
    if (isGitHubAction) {
      console.log('Detected GitHub action button, not interfering');
      return;
    }
    
    // Check if we clicked on or inside a GitHub button
    const isButton = target.tagName === 'BUTTON' || 
                    target.closest('button') || 
                    target.classList.contains('btn') ||
                    target.closest('.btn');
                    
    if (isButton) {
      // Look for comment-related buttons by text content
      const buttonText = (target.textContent || '').toLowerCase();
      const isCommentButton = 
        buttonText.includes('comment') || 
        buttonText.includes('review') ||
        buttonText.includes('edit') ||
        buttonText.includes('reply') ||
        buttonText.includes('write');
        
      if (isCommentButton) {
        console.log('Comment-related button clicked:', buttonText);
        
        // Check for new textareas after a short delay
        setTimeout(() => {
          processAllTextareas();
        }, 500); // Short delay to allow GitHub to render
      }
    }
    
    // Another check 2 seconds later for slower interactions
    setTimeout(() => {
      processAllTextareas();
    }, 2000);
  }, false); // Changed to false to let GitHub handle events first
  
  // Special handling for the Write tab in GitHub interface
  try {
    const writeTabs = document.querySelectorAll('button[role="tab"], a[role="tab"]');
    writeTabs.forEach(tab => {
      if ((tab.textContent || '').trim().toLowerCase() === 'write') {
        tab.addEventListener('click', () => {
          console.log('Write tab clicked, checking for textareas');
          setTimeout(processAllTextareas, 300);
        });
      }
    });
  } catch (error) {
    console.error('Error setting up write tab listeners:', error);
  }
  
  // Add listeners to specific buttons that create comment areas
  try {
    document.querySelectorAll('button[role="tab"][data-tab="write"], a[role="tab"][data-tab="write"]').forEach(button => {
      if (!button.dataset.polishListenerAdded) {
        button.dataset.polishListenerAdded = 'true';
        button.addEventListener('click', () => {
          setTimeout(processCommentAreas, 500);
        });
      }
    });
    
    // Find specific comment/review/reply buttons
    const commentButtons = document.querySelectorAll(
      'button.js-new-comment-button, ' +
      'button.js-add-line-comment, ' +
      'button.js-toggle-inline-comment-form, ' +
      'button.js-start-review, ' +
      'button.js-add-review-comment'
    );
    
    commentButtons.forEach(button => {
      if (!button.dataset.polishListenerAdded) {
        button.dataset.polishListenerAdded = 'true';
        button.addEventListener('click', () => {
          setTimeout(processCommentAreas, 500);
        });
      }
    });
  } catch (error) {
    console.error('Error setting up comment button listeners:', error);
  }
  
  // Monitor DOM changes specifically for textareas
  const textareaObserver = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach(mutation => {
      // Check if a textarea was added
      if (mutation.addedNodes && mutation.addedNodes.length) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          
          // Check if the node is a textarea or contains a textarea
          if (node.nodeName === 'TEXTAREA' || 
              (node.nodeType === 1 && node.querySelector('textarea'))) {
            shouldProcess = true;
            break;
          }
        }
      }
    });
    
    if (shouldProcess) {
      console.log('DOM mutation detected with new textareas');
      processAllTextareas();
    }
  });
  
  textareaObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Set up observer to detect dynamically added comment fields
// Make it safer by debouncing and targeting specific changes
const debouncedInitialize = debounce(initialize, 300);

// Run initialization once
debouncedInitialize();

// Create a more targeted observer that only watches for relevant changes
const observerConfig = { 
  childList: true, 
  subtree: true,
  attributes: false,
  characterData: false
};

// Only observe specific parts of the page where comments appear
const observer = new MutationObserver((mutations) => {
  // Only react to mutations that add nodes
  const shouldInitialize = mutations.some(mutation => {
    return mutation.addedNodes.length > 0 && 
           (mutation.target.classList.contains('js-comment-container') ||
            mutation.target.classList.contains('js-inline-comment-form') ||
            mutation.target.querySelector('.comment-form-textarea'));
  });
  
  if (shouldInitialize) {
    debouncedInitialize();
  }
});

// Wait for document to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Start observing only after DOM is loaded
    observer.observe(document.body, observerConfig);
  });
} else {
  // DOM already loaded, start observing
  observer.observe(document.body, observerConfig);
}

// Add event listeners for buttons that might create comment areas
function setupButtonListeners() {
  // Use a much more conservative approach that won't interfere with GitHub's buttons
  
  // Instead of listening to all clicks, only add listeners to specific elements
  // that might create comment areas but aren't GitHub action buttons
  
  // Find "Write comment" tabs
  document.querySelectorAll('button[role="tab"][data-tab="write"], a[role="tab"][data-tab="write"]').forEach(button => {
    if (!button.dataset.polishListenerAdded) {
      button.dataset.polishListenerAdded = 'true';
      button.addEventListener('click', () => {
        setTimeout(processCommentAreas, 500);
      });
    }
  });
  
  // Find specific comment/review/reply buttons
  const commentButtons = document.querySelectorAll(
    'button.js-new-comment-button, ' +
    'button.js-add-line-comment, ' +
    'button.js-toggle-inline-comment-form, ' +
    'button.js-start-review, ' +
    'button.js-add-review-comment'
  );
  
  commentButtons.forEach(button => {
    if (!button.dataset.polishListenerAdded) {
      button.dataset.polishListenerAdded = 'true';
      button.addEventListener('click', () => {
        setTimeout(processCommentAreas, 500);
      });
    }
  });
}

// Run on page load and whenever comment areas might appear
function initialize() {
  console.log('Initializing GitHub Comment Polisher');
  
  // Add indicator
  addDebugIndicator();
  
  // Process existing comment areas
  processCommentAreas();
  
 // Set up observer for new areas
  setupObserver();
  
  // Set up button listeners
  setupButtonListeners();
}

// Start the extension
initialize();

// Also check periodically for any missed areas
setInterval(processCommentAreas, 5000);

// Add polish button to a textarea 
function addPolishButton(textarea, commentType) {
  // Skip if already processed
  if (textarea.dataset.polishInitialized) {
    return;
  }
  
  // Skip if no parent element
  if (!textarea.parentElement) {
    return;
  }
  
  console.log('Adding polish button to textarea:', textarea.className);
  
  // Mark as processed
  textarea.dataset.polishInitialized = 'true';
  
  // Create button
  const polishButton = document.createElement('button');
  polishButton.textContent = '✨ Polish Message';
  polishButton.className = 'polish-message-btn btn btn-sm';
  polishButton.type = 'button';
  
  // Add click handler
  polishButton.addEventListener('click', (e) => {
    e.preventDefault();
    
    const comment = textarea.value;
    if (!comment.trim()) {
      alert('Please enter a comment before polishing.');
      return;
    }
    
    polishComment(textarea, comment, commentType);
  });
  
  // Insert after textarea
  textarea.insertAdjacentElement('afterend', polishButton);
}

// Process all text areas for our three specific cases
function processCommentAreas() {
  console.log('Scanning for GitHub comment areas...');
  
  // 1. New comments
  try {
    document.querySelectorAll('.js-new-comment-form textarea, .timeline-comment textarea').forEach(textarea => {
      addPolishButton(textarea, COMMENT_TYPES.REVIEW);
    });
  } catch (error) {
    console.error('Error selecting new comments:', error);
  }
  
  // 2. Edit comments
  try {
    document.querySelectorAll('.is-comment-editing textarea, .js-comment.is-comment-editing textarea').forEach(textarea => {
      addPolishButton(textarea, COMMENT_TYPES.RESPONSE);
    });
  } catch (error) {
    console.error('Error selecting edit comments:', error);
  }
  
  // 3. Reply comments
  try {
    document.querySelectorAll('.js-inline-comment-form textarea, .js-comment-field, .js-resolvable-timeline-thread-container textarea').forEach(textarea => {
      addPolishButton(textarea, COMMENT_TYPES.RESPONSE);
    });
  } catch (error) {
    console.error('Error selecting reply comments:', error);
  }
}

// Set up observer for detecting new textareas
function setupObserver() {
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeName === 'TEXTAREA' || 
              (node.nodeType === 1 && node.querySelector('textarea'))) {
            shouldProcess = true;
            break;
          }
        }
        if (shouldProcess) break;
      }
    }
    
    if (shouldProcess) {
      console.log('New textarea detected, processing comment areas');
      processCommentAreas();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
} 