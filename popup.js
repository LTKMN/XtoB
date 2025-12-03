// Popup script for Bluesky login

document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');
  
  // Check if already logged in
  const credentials = await chrome.storage.local.get(['bluesky_handle', 'bluesky_password']);
  
  if (credentials.bluesky_handle && credentials.bluesky_password) {
    showLoggedInView(credentials.bluesky_handle);
  } else {
    showLoginForm();
  }
});

function showLoginForm() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="status logged-out">
      ⚠️ Not logged in to Bluesky
    </div>
    
    <form id="loginForm">
      <div class="form-group">
        <label for="handle">Bluesky Handle</label>
        <input 
          type="text" 
          id="handle" 
          placeholder="username.bsky.social" 
          required
        >
        <div class="help-text">Your full Bluesky handle (e.g., username.bsky.social)</div>
      </div>
      
      <div class="form-group">
        <label for="password">App Password</label>
        <input 
          type="password" 
          id="password" 
          placeholder="xxxx-xxxx-xxxx-xxxx" 
          required
        >
        <div class="help-text">
          Create an app password in your Bluesky settings → App Passwords
        </div>
      </div>
      
      <button type="submit" id="loginBtn">Login to Bluesky</button>
      
      <div id="error" class="error" style="display: none;"></div>
    </form>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
}

function showLoggedInView(handle) {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="status logged-in">
      ✓ Logged in as <strong>${handle}</strong>
    </div>
    
    <div style="margin-top: 16px; padding: 12px; background: #f3f4f6; border-radius: 8px; font-size: 14px; color: #374151;">
      <strong>How to use:</strong><br>
      Visit Twitter/X and look for the "Post to Bluesky" button under each tweet!
    </div>
    
    <button class="logout-btn" id="logoutBtn">Logout</button>
  `;
  
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function handleLogin(e) {
  e.preventDefault();
  
  const handle = document.getElementById('handle').value.trim();
  const password = document.getElementById('password').value.trim();
  const loginBtn = document.getElementById('loginBtn');
  const errorDiv = document.getElementById('error');
  
  // Validate input
  if (!handle || !password) {
    showError('Please fill in all fields');
    return;
  }
  
  // Disable button and show loading state
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  errorDiv.style.display = 'none';
  
  try {
    // Test the credentials by creating a session
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: handle,
        password: password
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
    
    // Store credentials
    await chrome.storage.local.set({
      bluesky_handle: handle,
      bluesky_password: password
    });
    
    // Show success
    showLoggedInView(handle);
    
  } catch (error) {
    showError(error.message);
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login to Bluesky';
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await chrome.storage.local.remove(['bluesky_handle', 'bluesky_password', 'bluesky_session']);
    showLoginForm();
  }
}

function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}
