# Tweet to Bluesky Chrome Extension

Cross-post tweets to Bluesky with one click! This extension adds a "Post to Bluesky" button under every tweet on Twitter/X.

## Features

- ✅ One-click cross-posting from Twitter to Bluesky
- ✅ Preserves tweet text and images (up to 4 images)
- ✅ Adds attribution to original author
- ✅ Works with infinite scroll
- ✅ Secure credential storage

## Installation

### Step 1: Create Extension Icons

Before loading the extension, you need to create icon files. Create three PNG images:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon48.png` (48x48 pixels)  
- `icons/icon128.png` (128x128 pixels)

You can use any image editing tool or use a simple blue butterfly/bluesky-themed icon.

**Quick icon creation:**
```bash
# If you have ImageMagick installed:
convert -size 16x16 xc:#1185fe icons/icon16.png
convert -size 48x48 xc:#1185fe icons/icon48.png
convert -size 128x128 xc:#1185fe icons/icon128.png
```

### Step 2: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the `twitter-to-bluesky` folder
5. The extension should now appear in your extensions list

### Step 3: Set Up Bluesky Authentication

1. Click the extension icon in your Chrome toolbar
2. You'll need to create a Bluesky App Password:
   - Go to Bluesky Settings → App Passwords
   - Create a new app password
   - Copy the password (format: xxxx-xxxx-xxxx-xxxx)
3. Enter your Bluesky handle (e.g., `username.bsky.social`)
4. Enter your app password
5. Click "Login to Bluesky"

## Usage

1. Visit Twitter/X (twitter.com or x.com)
2. Look for the "Post to Bluesky" button under each tweet
3. Click the button to cross-post the tweet to Bluesky
4. The button will show "Posted!" on success

## What Gets Posted

The extension will:
- Copy the tweet text
- Include up to 4 images (if present)
- Add attribution to the original author (if space allows)
- Add a link to the original tweet (if space allows)
- Truncate to 300 characters if needed

## Security Notes

- Your Bluesky credentials are stored locally in Chrome's secure storage
- The extension uses app passwords (not your main Bluesky password)
- Sessions are refreshed automatically
- You can logout anytime from the extension popup

## Troubleshooting

**"Please log in to Bluesky first"**
- Click the extension icon and enter your credentials

**Button not appearing**
- Refresh the Twitter page
- Make sure you're on twitter.com or x.com
- Check that the extension is enabled

**"Error posting to Bluesky"**
- Check your internet connection
- Try logging out and back in
- Verify your app password is still valid

**Images not uploading**
- Image upload requires the original tweet to have accessible images
- Some protected tweets may not work

## Technical Details

- Built with Chrome Extension Manifest V3
- Uses Bluesky AT Protocol API
- Content script injection for Twitter UI
- Background service worker for API calls

## Privacy

This extension:
- Only accesses Twitter and Bluesky domains
- Stores credentials locally (not sent anywhere else)
- Only posts when you click the button
- Does not collect any analytics or tracking data

## Permissions

- `storage`: Store Bluesky credentials
- `activeTab`: Inject buttons into Twitter
- Host permissions: Twitter and Bluesky domains only

## Development

Built by: Brennan
Based on: Chrome Extension Manifest V3 + Bluesky AT Protocol

## License

MIT License - Free to use and modify

---

Made with ❤️ for the open social web
