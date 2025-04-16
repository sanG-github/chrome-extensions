// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'polishComment') {
    polishComment(request.comment, request.commentType)
      .then(polishedComment => {
        sendResponse({ polishedComment });
      })
      .catch(error => {
        console.error('Error:', error);
        sendResponse({ error: error.message });
      });
    return true; // Keep the message channel open for the async response
  }
});

// Polish comment using AI API
async function polishComment(comment, commentType) {
  // Retrieve API settings from storage
  const data = await chrome.storage.sync.get(['apiKey', 'apiEndpoint', 'apiProvider']);
  const apiKey = data.apiKey;
  const apiEndpoint = data.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions';
  const apiProvider = data.apiProvider || 'deepseek';
  
  if (!apiKey) {
    throw new Error('API key not set. Please set it in the extension settings.');
  }
  
  // Create system prompt based on comment type
  const systemPrompt = createSystemPrompt(commentType);
  
  // Send to selected AI API
  switch (apiProvider.toLowerCase()) {
    case 'deepseek':
      return await callDeepseekAPI(apiKey, apiEndpoint, systemPrompt, comment);
    case 'openai':
      return await callOpenAIAPI(apiKey, apiEndpoint, systemPrompt, comment);
    default:
      throw new Error(`Unsupported API provider: ${apiProvider}`);
  }
}

// Create system prompt based on comment type
function createSystemPrompt(commentType) {
  const basePrompt = `You're a comment polisher for GitHub pull request reviews following Nimble's PR feedback guidelines.
  
Your task is to polish the provided comment to make it more courteous, respectful, clear, and helpful while preserving its original meaning.

IMPORTANT: Return ONLY the polished comment with no additional explanations, headers, or text like "Here's a polished version" or "I've made these changes". Just provide the polished comment text, nothing else.

General guidelines:
- Be kind and respectful
- Focus on the code, never on the author
- Be explicit and clear (people don't always understand intentions online)
- Be humble ("I'm not sure - let's look it up.")
- Ask for clarification when needed ("I didn't understand. Can you clarify?")
- Avoid selective ownership of code (no "mine", "not mine", "yours")
- Avoid making demands, use suggestions instead
- Avoid subjective opinions
- Avoid terms that could be seen as referring to personal traits
- Don't use hyperbole ("always", "never", "endlessly", "nothing")
- Add appropriate emoji icons to bring joy without being excessive`;

  // Add type-specific guidelines
  switch (commentType) {
    case 'review':
      return `${basePrompt}
      
For review feedback specifically:
- Explain the reasoning WHY
- Balance giving explicit direction with just pointing out problems
- Encourage simplification or code comments instead of just explaining complexity
- Accept that many programming decisions are opinions and discuss tradeoffs
- Where appropriate, add positive reinforcement for good implementation
- Transform demands like "Change X to Y" into questions like "What do you think about changing X to Y?"
- Use emojis like 💡 for suggestions, ❓ for questions, 🔧 for minor issues

Remember, return ONLY the polished comment text with no explanations or headers.`;
      
    case 'response':
      return `${basePrompt}
      
For responding to feedback specifically:
- Be grateful for suggestions (e.g., "Good idea. I will make that change.")
- Acknowledge when mistakes were spotted (e.g., "Good catch, I missed that. Fixing it now.")
- If referencing a commit, use the proper format (e.g., "Fixed in a4994ec")
- Assume the best intention from the reviewer's comments
- Use emojis like 👍 for agreement, 🙌 for acknowledgment

Remember, return ONLY the polished comment text with no explanations or headers.`;
      
    case 'approval':
      return `${basePrompt}
      
For approval comments specifically:
- For pre-approval with minor changes, use specific prefixes like:
  "Optional: I think this may be a good idea, but it's not strictly required."
  "FYI: I don't expect you to do this in this PR, but you may find this interesting to think about for future implementation."
- Express confidence in the code's correctness and consistency
- Use emojis like ✅ or ⭐ for pre-approval suggestions

Remember, return ONLY the polished comment text with no explanations or headers.`;
      
    default:
      return `${basePrompt}
      
Remember, return ONLY the polished comment text with no explanations or headers.`;
  }
}

// Call Deepseek API
async function callDeepseekAPI(apiKey, apiEndpoint, systemPrompt, comment) {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Polish this GitHub PR comment: ${comment}`
        }
      ],
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  const result = await response.json();
  return result.choices[0].message.content;
}

// Call OpenAI API
async function callOpenAIAPI(apiKey, apiEndpoint, systemPrompt, comment) {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Polish this GitHub PR comment: ${comment}`
        }
      ],
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
  }
  
  const result = await response.json();
  return result.choices[0].message.content;
} 