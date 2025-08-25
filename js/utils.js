// פונקציות עזר משותפות
function hideInstallButtons() {
  const iosButton = document.getElementById(CONFIG.SELECTORS.IOS_BUTTON.slice(1));
  const androidButton = document.getElementById(CONFIG.SELECTORS.ANDROID_BUTTON.slice(1));
  const pwaButton = document.getElementById(CONFIG.SELECTORS.PWA_BUTTON.slice(1));
  
  if (iosButton) iosButton.style.display = 'none';
  if (androidButton) androidButton.style.display = 'none';
  if (pwaButton) pwaButton.style.display = 'none';
}

// יצירת הודעת שגיאה
function createErrorMessage(message) {
  return `<div class="error-message" role="alert">${message}</div>`;
}

// עדכון סטטוס עם הודעה
function updateStatus(message) {
  const statusEl = document.querySelector(CONFIG.SELECTORS.STATUS);
  if (statusEl) {
    statusEl.innerHTML = createErrorMessage(message);
  }
}

// ניקוי container ועדכון עם הודעה
function updateContainer(container, message) {
  if (container) {
    container.innerHTML = createErrorMessage(message);
  }
}

function showInstallButton(buttonId, hideOthers = true) {
  const button = document.getElementById(buttonId);
  if (!button) return false;
  
  button.style.display = 'flex';
  
  if (hideOthers) {
    const allButtons = ['ios-add-to-home', 'android-install', 'pwa-install'];
    allButtons.forEach(id => {
      if (id !== buttonId) {
        const otherButton = document.getElementById(id);
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
