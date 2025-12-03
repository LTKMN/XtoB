// Content script for injecting Bluesky buttons into Twitter

let processedTweets = new Set();

// Format post text (same logic as background.js)
function formatPostText(tweetData) {
  let text = tweetData.text;
  
  const quoteHeader = 'quote: ';
  const linkFooter = '\n\n';
  
  let reservedSpace = quoteHeader.length + linkFooter.length;
  if (tweetData.author) {
    reservedSpace += tweetData.author.length + 2;
  } else {
    reservedSpace += 6 + 2;
  }
  if (tweetData.link) {
    reservedSpace += tweetData.link.length + 2;
  }
  
  const maxTweetLength = 300 - reservedSpace;
  if (text.length > maxTweetLength) {
    text = text.substring(0, maxTweetLength - 3) + '...';
  }
  
  let postText = quoteHeader;
  if (tweetData.author) {
    postText += tweetData.author + '\n\n';
  } else {
    postText += 'Twitter\n\n';
  }
  postText += text;
  if (tweetData.link) {
    postText += linkFooter + tweetData.link;
  }
  
  if (postText.length > 300) {
    const linkPart = tweetData.link ? linkFooter + tweetData.link : '';
    const authorPart = tweetData.author || 'Twitter';
    const headerPart = quoteHeader + authorPart + '\n\n';
    const maxLength = 300 - headerPart.length - linkPart.length;
    text = text.substring(0, Math.max(0, maxLength - 3)) + '...';
    postText = headerPart + text + linkPart;
  }
  
  return postText;
}

// Get native size image URL from Twitter image URL
function getNativeImageUrl(imgUrl) {
  if (!imgUrl) return imgUrl;
  
  // Twitter image URLs typically look like:
  // https://pbs.twimg.com/media/XXXXX?format=jpg&name=small
  // We want to get the original size by changing name=orig or removing size constraints
  try {
    const url = new URL(imgUrl);
    
    // For pbs.twimg.com media URLs, set name to 'orig' for original size
    if (url.hostname.includes('pbs.twimg.com') || url.hostname.includes('twimg.com')) {
      // Keep the format parameter if it exists, otherwise set to jpg
      if (!url.searchParams.has('format')) {
        url.searchParams.set('format', 'jpg');
      }
      // Set name to orig for original size
      url.searchParams.set('name', 'orig');
      return url.toString();
    }
    
    // For other Twitter image URLs, try to get larger size
    // Remove size constraints
    url.searchParams.delete('name');
    if (!url.searchParams.has('format')) {
      url.searchParams.set('format', 'jpg');
    }
    
    return url.toString();
  } catch (e) {
    // If URL parsing fails, try simple string replacement
    // Replace name=small/medium/thumb with name=orig
    let result = imgUrl.replace(/[?&]name=(small|medium|thumb|large)/gi, (match, size) => {
      return match.replace(size, 'orig');
    });
    
    // Ensure format is set
    if (!result.includes('format=')) {
      result += (result.includes('?') ? '&' : '?') + 'format=jpg';
    }
    
    return result;
  }
}

function extractTweetData(tweetElement) {
  try {
    // Find the tweet text (only from the main tweet, not quote)
    const tweetTextElements = tweetElement.querySelectorAll('[data-testid="tweetText"]');
    const tweetTextElement = tweetTextElements[0]; // First one is the main tweet
    const tweetText = tweetTextElement ? tweetTextElement.innerText : '';
    
    // Find the author
    const authorElement = tweetElement.querySelector('[data-testid="User-Name"]');
    const authorName = authorElement ? authorElement.innerText.split('\n')[0] : '';
    
    // Find quote tweet element using multiple strategies
    let quoteTweetElement = null;
    
    // Strategy 1: Look for nested articles (most common)
    const allNestedArticles = Array.from(tweetElement.querySelectorAll('article[data-testid="tweet"]'))
      .filter(article => article !== tweetElement && tweetElement.contains(article));
    
    if (allNestedArticles.length > 0) {
      quoteTweetElement = allNestedArticles[0];
    }
    
    // Strategy 2: Look for quote tweet container (div with role="link" containing a tweet)
    if (!quoteTweetElement) {
      const quoteContainers = Array.from(tweetElement.querySelectorAll('div[role="link"]'));
      for (const container of quoteContainers) {
        const nestedArticle = container.querySelector('article[data-testid="tweet"]');
        if (nestedArticle && nestedArticle !== tweetElement && tweetElement.contains(nestedArticle)) {
          quoteTweetElement = nestedArticle;
          break;
        }
      }
    }
    
    // Strategy 3: Look for quote tweet preview area (often has specific structure)
    if (!quoteTweetElement) {
      // Quote tweets often have a card wrapper or specific div structure
      const potentialQuoteAreas = tweetElement.querySelectorAll('div[data-testid="card.wrapper"], div[data-testid="tweet"]');
      for (const area of potentialQuoteAreas) {
        if (area === tweetElement) continue;
        const nestedArticle = area.querySelector('article[data-testid="tweet"]');
        if (nestedArticle && nestedArticle !== tweetElement && tweetElement.contains(nestedArticle)) {
          quoteTweetElement = nestedArticle;
          break;
        }
      }
    }
    
    // Strategy 4: Look for the second [data-testid="tweetText"] - if there are 2, the second is likely the quote
    if (!quoteTweetElement && tweetTextElements.length > 1) {
      // The second tweetText element is likely in the quote tweet
      const secondTweetText = tweetTextElements[1];
      quoteTweetElement = secondTweetText.closest('article[data-testid="tweet"]');
      if (quoteTweetElement === tweetElement) {
        quoteTweetElement = null;
      }
    }
    
    // Now collect all images
    const images = [];
    const quoteTweetImages = [];
    const seenUrls = new Set(); // Avoid duplicates
    
    // Find images from main tweet (exclude quote tweet area)
    const mainImageContainers = tweetElement.querySelectorAll('[data-testid="tweetPhoto"]');
    mainImageContainers.forEach(container => {
      // Skip if this container is inside the quote tweet
      if (quoteTweetElement && quoteTweetElement.contains(container)) {
        return;
      }
      
      const img = container.querySelector('img');
      if (img && img.src && !img.src.includes('profile_images') && !img.src.includes('emoji')) {
        if (!seenUrls.has(img.src)) {
          images.push(getNativeImageUrl(img.src));
          seenUrls.add(img.src);
        }
      }
    });
    
    // Find images from quote tweet if it exists
    if (quoteTweetElement) {
      const quoteImageContainers = quoteTweetElement.querySelectorAll('[data-testid="tweetPhoto"]');
      quoteImageContainers.forEach(container => {
        const img = container.querySelector('img');
        if (img && img.src && !img.src.includes('profile_images') && !img.src.includes('emoji')) {
          if (!seenUrls.has(img.src)) {
            quoteTweetImages.push(getNativeImageUrl(img.src));
            seenUrls.add(img.src);
          }
        }
      });
      
      // Also try to find images directly in quote tweet (fallback)
      if (quoteTweetImages.length === 0) {
        const allQuoteImgs = quoteTweetElement.querySelectorAll('img[src*="pbs.twimg.com"], img[src*="twimg.com"]');
        allQuoteImgs.forEach(img => {
          if (img.src && !img.src.includes('profile_images') && !img.src.includes('emoji') && !seenUrls.has(img.src)) {
            // Check if it's likely a tweet image (not an icon/avatar)
            const parent = img.closest('div');
            if (parent && (parent.querySelector('[data-testid="tweetPhoto"]') || img.offsetWidth > 100)) {
              quoteTweetImages.push(getNativeImageUrl(img.src));
              seenUrls.add(img.src);
            }
          }
        });
      }
    }
    
    // Debug logging (can be removed later)
    if (quoteTweetElement) {
      console.log('Quote tweet detected:', {
        hasQuoteImages: quoteTweetImages.length > 0,
        quoteImageCount: quoteTweetImages.length,
        mainImageCount: images.length
      });
    }
    
    // Get tweet link
    const timeElement = tweetElement.querySelector('time');
    const tweetLink = timeElement ? timeElement.parentElement.href : '';
    
    return {
      text: tweetText,
      author: authorName,
      images: images,
      quoteTweetImages: quoteTweetImages,
      link: tweetLink,
      hasQuoteTweet: quoteTweetImages.length > 0
    };
  } catch (error) {
    console.error('Error extracting tweet data:', error);
    return null;
  }
}

function createBlueskyButton() {
  const button = document.createElement('div');
  button.className = 'bluesky-repost-button';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
    <span>Post to Bluesky</span>
  `;
  
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const tweetElement = button.closest('article');
    const tweetData = extractTweetData(tweetElement);
    
    if (!tweetData) {
      alert('Could not extract tweet data');
      return;
    }
    
    // Show editor modal
    showEditorModal(tweetData, button);
  });
  
  return button;
}

function addBlueskyButton(tweetElement) {
  // Check if button already exists
  if (tweetElement.querySelector('.bluesky-repost-button')) {
    return;
  }
  
  // Find the action bar (like, retweet, share buttons)
  const actionBar = tweetElement.querySelector('[role="group"]');
  
  if (actionBar) {
    const button = createBlueskyButton();
    
    // Create a wrapper to match Twitter's button style
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display: flex; align-items: center; margin-left: 12px;';
    wrapper.appendChild(button);
    
    actionBar.appendChild(wrapper);
  }
}

function processTweets() {
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');
  
  tweets.forEach(tweet => {
    const tweetId = tweet.querySelector('time')?.parentElement?.href;
    if (tweetId && !processedTweets.has(tweetId)) {
      addBlueskyButton(tweet);
      processedTweets.add(tweetId);
    }
  });
}

// Initial processing
setTimeout(processTweets, 1000);

// Watch for new tweets being loaded (infinite scroll)
const observer = new MutationObserver((mutations) => {
  processTweets();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Process on scroll
let scrollTimeout;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(processTweets, 300);
});

// Show editor modal
function showEditorModal(tweetData, button) {
  // Remove existing modal if any
  const existingModal = document.getElementById('bluesky-editor-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Format the initial post text
  const initialText = formatPostText(tweetData);
  const charCount = initialText.length;
  const hasQuoteImages = tweetData.quoteTweetImages && tweetData.quoteTweetImages.length > 0;
  
  // Debug logging
  console.log('Editor modal data:', {
    hasQuoteImages,
    quoteTweetImages: tweetData.quoteTweetImages,
    mainImages: tweetData.images,
    hasQuoteTweet: tweetData.hasQuoteTweet
  });
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'bluesky-editor-modal';
  modal.className = 'bluesky-editor-modal';
  modal.innerHTML = `
    <div class="bluesky-editor-overlay"></div>
    <div class="bluesky-editor-content">
      <div class="bluesky-editor-header">
        <h3>Edit Bluesky Post</h3>
        <button class="bluesky-editor-close" aria-label="Close">&times;</button>
      </div>
      <div class="bluesky-editor-body">
        <textarea 
          id="bluesky-editor-textarea" 
          class="bluesky-editor-textarea" 
          maxlength="300"
          rows="8"
        >${initialText}</textarea>
        ${hasQuoteImages ? `
        <div class="bluesky-editor-options">
          <label class="bluesky-editor-checkbox-label">
            <input type="checkbox" id="bluesky-include-quote-images" checked>
            <span>Include quote tweet images (${tweetData.quoteTweetImages.length} image${tweetData.quoteTweetImages.length > 1 ? 's' : ''})</span>
          </label>
        </div>
        ` : ''}
        <div class="bluesky-editor-footer">
          <span class="bluesky-editor-charcount">
            <span id="bluesky-editor-count">${charCount}</span>/300
          </span>
          <div class="bluesky-editor-buttons">
            <button class="bluesky-editor-cancel">Cancel</button>
            <button class="bluesky-editor-post">Post to Bluesky</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const textarea = modal.querySelector('#bluesky-editor-textarea');
  const charCountSpan = modal.querySelector('#bluesky-editor-count');
  const closeBtn = modal.querySelector('.bluesky-editor-close');
  const cancelBtn = modal.querySelector('.bluesky-editor-cancel');
  const postBtn = modal.querySelector('.bluesky-editor-post');
  const overlay = modal.querySelector('.bluesky-editor-overlay');
  
  // Update character count
  textarea.addEventListener('input', () => {
    const count = textarea.value.length;
    charCountSpan.textContent = count;
    if (count > 300) {
      charCountSpan.style.color = '#ef4444';
    } else {
      charCountSpan.style.color = '';
    }
  });
  
  // Close handlers
  const closeModal = () => modal.remove();
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', closeModal);
  
  // Escape key to close
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  // Post handler
  postBtn.addEventListener('click', async () => {
    const postText = textarea.value.trim();
    
    if (!postText) {
      alert('Post cannot be empty');
      return;
    }
    
    if (postText.length > 300) {
      alert('Post is too long (max 300 characters)');
      return;
    }
    
    // Get checkbox state
    const includeQuoteCheckbox = modal.querySelector('#bluesky-include-quote-images');
    const includeQuoteImages = includeQuoteCheckbox ? includeQuoteCheckbox.checked : false;
    
    // Close modal
    closeModal();
    document.removeEventListener('keydown', escapeHandler);
    
    // Disable button and show loading state
    button.classList.add('loading');
    button.querySelector('span').textContent = 'Posting...';
    
    // Prepare images array - include quote tweet images if checkbox is checked
    const imagesToPost = [...tweetData.images];
    if (includeQuoteImages && tweetData.quoteTweetImages) {
      imagesToPost.push(...tweetData.quoteTweetImages);
    }
    
    // Limit to 4 images total (Bluesky limit)
    const finalImages = imagesToPost.slice(0, 4);
    
    // Send to background script with edited text
    chrome.runtime.sendMessage(
      { 
        action: 'postToBluesky', 
        tweetData: {
          ...tweetData,
          images: finalImages
        },
        postText: postText // Include the edited text
      },
      (response) => {
        if (response.success) {
          button.classList.remove('loading');
          button.classList.add('success');
          button.querySelector('span').textContent = 'Posted!';
          setTimeout(() => {
            button.classList.remove('success');
            button.querySelector('span').textContent = 'Post to Bluesky';
          }, 3000);
        } else {
          button.classList.remove('loading');
          button.classList.add('error');
          button.querySelector('span').textContent = 'Error';
          alert('Error posting to Bluesky: ' + response.error);
          setTimeout(() => {
            button.classList.remove('error');
            button.querySelector('span').textContent = 'Post to Bluesky';
          }, 3000);
        }
      }
    );
  });
  
  // Focus textarea
  setTimeout(() => textarea.focus(), 100);
}
