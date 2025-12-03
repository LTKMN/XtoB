# Tweet to Bluesky Chrome Extension

Cross-post tweets to Bluesky with one click! This extension adds a "Post to Bluesky" button under every tweet on Twitter/X.

## Features

- ✅ One-click cross-posting from Twitter to Bluesky
- ✅ Preserves tweet text and images (up to 4 images)
- ✅ Adds attribution to original author
- ✅ Works with infinite scroll
- ✅ Secure credential storage

## Installation

### Download this whole repo

1. Download the whole repo as zip file
2. Unzip it somewhere

### Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top right)
3. Click "Load unpacked"
4. Select the unzipped `XtoB-main` folder (note: there might be a folder-within-a-folder with the same name depending on your unzipper -- if Chrome says "can't load manifest" it's because you're trying to upload the top-level folder; instead upload the folder that actually has the files (and manifest.json) inside it)
5. The extension should now appear in your extensions list

### Set Up Bluesky Authentication

1. Click the extension icon in your Chrome toolbar
2. You'll need to create a Bluesky App Password:
   - Go to Bluesky Settings → App Passwords
   - Create a new app password
   - Copy the password (format: xxxx-xxxx-xxxx-xxxx)
3. Enter your Bluesky handle (e.g., `username.bsky.social`)
4. Enter your app password
5. Click "Login to Bluesky"

   NOTE: this password is only stored locally in your browser, I don't get or want any access to it. It's just the auth to write posts to your account.

## Usage

1. Visit Twitter/X (twitter.com or x.com)
2. Look for the "Post to Bluesky" button under each tweet
3. Click the button to cross-post the tweet to Bluesky
4. The button will show "Posted!" on success

KNOWN BUG: sometimes the button doesn't show up and you need to refresh. I'm also unclear on which pages it works on (it shows up in the feed but not individual tweets, seemingly, I just haven't gotten around to looking into it yet)

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

Built by: Sonnet 4.5 (and brennan, sparingly)
Based on: Chrome Extension Manifest V3 + Bluesky AT Protocol

Made with ❤️ for the open social web
