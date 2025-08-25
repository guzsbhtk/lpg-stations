// פונקציות עזר משותפות
function hideInstallButtons() {
  const iosButton = document.getElementById('ios-add-to-home');
  const androidButton = document.getElementById('android-install');
  const pwaButton = document.getElementById('pwa-install');
  
  if (iosButton) iosButton.style.display = 'none';
  if (androidButton) androidButton.style.display = 'none';
  if (pwaButton) pwaButton.style.display = 'none';
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
