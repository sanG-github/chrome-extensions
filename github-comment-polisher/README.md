# GitHub Comment Polisher

A Chrome extension to automatically polish GitHub pull request comments according to [Nimble's PR feedback guidelines](https://nimblehq.co/compass/development/code-reviews/pull-request-feedback/).

## Features

- 🎯 Polishes comments to follow company guidelines
- 🔄 Transforms demands into suggestions
- 🧹 Removes subjective language
- 🎭 Adds appropriate emojis
- 📋 Provides quick templates for common feedback patterns
- ⚙️ Supports multiple AI providers (DeepSeek, OpenAI)

## Installation

### From Source

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the `github-comment-polisher` folder
5. The extension should now be installed and active

## Setup

1. Click on the extension icon in your browser toolbar
2. Choose your preferred AI provider (DeepSeek or OpenAI)
3. Enter your API key
4. Optionally, specify a custom API endpoint
5. Click "Save Settings"

## Usage

### Polishing Comments

1. Navigate to any GitHub pull request
2. Type your comment in the comment box
3. Select the appropriate comment type:
   - **Review Feedback** - When reviewing someone else's code
   - **Response to Feedback** - When responding to reviewer comments
   - **Approval Comment** - When approving a PR
4. Click the "✨ Polish Comment" button
5. Your comment will be transformed according to guidelines
6. Review the polished version before submitting

### Quick Templates

The extension provides quick template buttons for common feedback patterns:
- 💡 What do you think about...
- 🔍 Have you considered...
- ⭐ Optional suggestion
- 👍 Good idea
- 🙌 Good catch

Click any template button to insert the template at the cursor position.

## Guidelines Followed

This extension enforces Nimble's PR feedback guidelines:

- Be courteous and respectful
- Focus on the code, never on the author
- Be explicit and clear
- Be humble and ask for clarification when needed
- Avoid selective ownership of code
- Transform demands into suggestions
- Avoid subjective opinions
- Avoid terms that could be seen as referring to personal traits
- Don't use hyperbole

## Privacy

This extension:
- Only processes comments you explicitly choose to polish
- Sends data to the AI provider specified in your settings
- Doesn't store your comments or AI responses
- Stores your API key securely in Chrome's sync storage

## License

MIT

## Credits

Developed based on [Nimble's PR feedback guidelines](https://nimblehq.co/compass/development/code-reviews/pull-request-feedback/) 