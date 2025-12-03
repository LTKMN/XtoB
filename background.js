// Background service worker for Bluesky API integration

const BLUESKY_API = 'https://bsky.social/xrpc';

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'postToBluesky') {
    handleBlueskyPost(request.tweetData, request.postText)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
});

async function handleBlueskyPost(tweetData, postText = null) {
  // Get stored credentials
  const credentials = await chrome.storage.local.get(['bluesky_handle', 'bluesky_password', 'bluesky_session']);
  
  if (!credentials.bluesky_handle || !credentials.bluesky_password) {
    throw new Error('Please log in to Bluesky first (click the extension icon)');
  }
  
  // Get or create session
  let session = credentials.bluesky_session;
  if (!session || isSessionExpired(session)) {
    session = await createSession(credentials.bluesky_handle, credentials.bluesky_password);
    await chrome.storage.local.set({ bluesky_session: session });
  }
  
  // Use provided postText or format it
  if (!postText) {
    postText = formatPostText(tweetData);
  }
  
  // Create the post
  const post = await createBlueskyPost(session, postText, tweetData);
  
  return post;
}

async function createSession(handle, password) {
  const response = await fetch(`${BLUESKY_API}/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: handle,
      password: password
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.message || 'Unknown error'}`);
  }
  
  const session = await response.json();
  session.timestamp = Date.now();
  return session;
}

function isSessionExpired(session) {
  if (!session || !session.timestamp) return true;
  
  // Sessions expire after ~2 hours, refresh after 1 hour
  const oneHour = 60 * 60 * 1000;
  return (Date.now() - session.timestamp) > oneHour;
}

function formatPostText(tweetData) {
  // Create the post text with clear quote/retweet indication
  let text = tweetData.text;
  
  // Reserve space for quote header and link
  const quoteHeader = 'quote: ';
  const linkFooter = '\n\n';
  
  // Calculate reserved space
  let reservedSpace = quoteHeader.length + linkFooter.length;
  if (tweetData.author) {
    reservedSpace += tweetData.author.length + 2; // +2 for newlines
  } else {
    reservedSpace += 6 + 2; // "Twitter" + newlines
  }
  if (tweetData.link) {
    reservedSpace += tweetData.link.length + 2; // +2 for newlines
  }
  
  // Truncate tweet text to make room for header and link
  const maxTweetLength = 300 - reservedSpace;
  if (text.length > maxTweetLength) {
    text = text.substring(0, maxTweetLength - 3) + '...';
  }
  
  // Build the final post with clear quote indication
  let postText = quoteHeader;
  
  // Add author attribution in header
  if (tweetData.author) {
    postText += tweetData.author + '\n\n';
  } else {
    postText += 'Twitter\n\n';
  }
  
  // Add the tweet text
  postText += text;
  
  // Always add the link to original tweet
  if (tweetData.link) {
    postText += linkFooter + tweetData.link;
  }
  
  // Final safety check (shouldn't be needed, but just in case)
  if (postText.length > 300) {
    // If somehow still too long, truncate more aggressively
    const linkPart = tweetData.link ? linkFooter + tweetData.link : '';
    const authorPart = tweetData.author || 'Twitter';
    const headerPart = quoteHeader + authorPart + '\n\n';
    const maxLength = 300 - headerPart.length - linkPart.length;
    text = text.substring(0, Math.max(0, maxLength - 3)) + '...';
    postText = headerPart + text + linkPart;
  }
  
  return postText;
}

async function createBlueskyPost(session, text, tweetData) {
  const record = {
    text: text,
    createdAt: new Date().toISOString(),
    $type: 'app.bsky.feed.post'
  };
  
  // Add facets for links if present
  record.facets = extractFacets(text);
  
  // Handle images if present
  if (tweetData.images && tweetData.images.length > 0) {
    record.embed = await uploadImages(session, tweetData.images);
  }
  
  const response = await fetch(`${BLUESKY_API}/com.atproto.repo.createRecord`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.accessJwt}`
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record: record
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create post: ${error.message || 'Unknown error'}`);
  }
  
  return await response.json();
}

function extractFacets(text) {
  const facets = [];
  
  // Find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  let match;
  
  while ((match = urlRegex.exec(text)) !== null) {
    facets.push({
      index: {
        byteStart: new TextEncoder().encode(text.substring(0, match.index)).length,
        byteEnd: new TextEncoder().encode(text.substring(0, match.index + match[0].length)).length
      },
      features: [{
        $type: 'app.bsky.richtext.facet#link',
        uri: match[0]
      }]
    });
  }
  
  return facets.length > 0 ? facets : undefined;
}

async function uploadImages(session, imageUrls) {
  const images = [];
  
  // Bluesky allows up to 4 images
  const imagesToUpload = imageUrls.slice(0, 4);
  
  for (const imageUrl of imagesToUpload) {
    try {
      // Fetch the image
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      
      // Upload to Bluesky
      const uploadResponse = await fetch(`${BLUESKY_API}/com.atproto.repo.uploadBlob`, {
        method: 'POST',
        headers: {
          'Content-Type': imageBlob.type,
          'Authorization': `Bearer ${session.accessJwt}`
        },
        body: imageBlob
      });
      
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        images.push({
          alt: '',
          image: uploadData.blob
        });
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  }
  
  if (images.length > 0) {
    return {
      $type: 'app.bsky.embed.images',
      images: images
    };
  }
  
  return undefined;
}
