// פונקציות עזר משותפות
function hideInstallButtons() {
  const iosButton = document.querySelector(CONFIG.SELECTORS.IOS_BUTTON);
  const androidButton = document.querySelector(CONFIG.SELECTORS.ANDROID_BUTTON);
  const pwaButton = document.querySelector(CONFIG.SELECTORS.PWA_BUTTON);
  
  if (iosButton) iosButton.style.display = 'none';
  if (androidButton) androidButton.style.display = 'none';
  if (pwaButton) pwaButton.style.display = 'none';
}

function showInstallButton(buttonId, hideOthers = true) {
  const button = document.querySelector(buttonId);
  if (!button) return false;
  
  button.style.display = 'flex';
  
  if (hideOthers) {
    const allButtons = [CONFIG.SELECTORS.IOS_BUTTON, CONFIG.SELECTORS.ANDROID_BUTTON, CONFIG.SELECTORS.PWA_BUTTON];
    allButtons.forEach(selector => {
      if (selector !== buttonId) {
        const otherButton = document.querySelector(selector);
        if (otherButton) otherButton.style.display = 'none';
      }
    });
  }
  
  return true;
}

function logInstallDebug(platform, checks) {
  console.log(`=== ${platform} Install Debug ===`);
  Object.entries(checks).forEach(([key, value]) => {
    console.log(`${key}:`, value);
  });
}

function logInstallFailure(reasons) {
  console.log('❌ Install button not shown because:');
  reasons.forEach(reason => {
    if (reason.condition) {
      console.log(`- ${reason.message}`);
    }
  });
}

// Debounce utility – prevents excessive calls on frequent events (e.g., input)
function debounce(func, wait) {
  let timeoutId;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}
