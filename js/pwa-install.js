// ניהול התקנת PWA
let deferredPrompt;

// תפיסת beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('PWA Install prompt available');
  // מונע את הצגת הכפתור האוטומטי
  e.preventDefault();
  // שומר את האירוע לשימוש מאוחר יותר
  deferredPrompt = e;
  
  // הצג כפתור התקנה מותאם אישית
  showPWAInstallButton();
});

function showPWAInstallButton() {
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  if (isStandalone()) {
    console.log('🚫 PWA Install Button - App already installed, skipping');
    return;
  }
  
  const pwaInstallButton = document.getElementById('pwa-install');
  
  // בדיקה אם האפליקציה כבר מותקנת
  const isAlreadyInstalled = isStandalone();
  
  // באנדרואיד - הצג PWA רק אם כפתור החנות לא מוצג
  if (isAndroid() && isMobile()) {
    const androidInstallButton = document.getElementById('android-install');
    if (androidInstallButton && androidInstallButton.style.display === 'flex') {
      if (pwaInstallButton) pwaInstallButton.style.display = 'none';
      console.log('❌ PWA Install Button hidden - Android store button has priority');
      return;
    }
  }

  console.log('PWA Install Debug:', {
    isMobile: isMobile(),
    hasDeferredPrompt: !!deferredPrompt,
    isAlreadyInstalled,
    standalone: window.navigator.standalone,
    userAgent: window.navigator.userAgent
  });
  
  // הצג את הכפתור רק אם זה מכשיר נייד, יש PWA prompt והאפליקציה לא מותקנת
  if (pwaInstallButton && isMobile() && deferredPrompt && !isAlreadyInstalled) {
    pwaInstallButton.style.display = 'flex';
    console.log('✅ PWA Install Button should be visible now');
  } else {
    console.log('❌ PWA Install Button not shown because:');
    if (!pwaInstallButton) console.log('- Button element not found');
    if (!isMobile()) console.log('- Not mobile device');
    if (!deferredPrompt) console.log('- No PWA install prompt available');
    if (isAlreadyInstalled) console.log('- App already installed');
  }
}

function installPWA() {
  if (deferredPrompt) {
    console.log('Installing PWA...');
    deferredPrompt.prompt();
    
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installed successfully');
      } else {
        console.log('PWA installation declined');
      }
      deferredPrompt = null;
    });
  }
}

function showIOSAddToHomeButton() {
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  if (isStandalone()) {
    console.log('🚫 iOS Add to Home Button - App already installed, skipping');
    return;
  }
  
  const addToHomeButton = document.querySelector(CONFIG.SELECTORS.IOS_BUTTON);
  const androidInstallButton = document.querySelector(CONFIG.SELECTORS.ANDROID_BUTTON);
  
  // דיבוג - הדפסת מידע לקונסול
  logInstallDebug('iOS Add to Home', {
    'User Agent': navigator.userAgent,
    'isMobile()': isMobile(),
    'isIOS()': isIOS(),
    'isStandalone()': isStandalone(),
    'Button element found': !!addToHomeButton
  });
  
  // בדיקה אם הכפתור קיים ב-DOM
  if (!addToHomeButton) {
    console.log('🔍 Searching for button in DOM...');
    const allButtons = document.querySelectorAll('button');
    console.log('Total buttons found:', allButtons.length);
    allButtons.forEach((btn, index) => {
      console.log(`Button ${index}:`, btn.id, btn.className, btn.textContent);
    });
  }
  
  // הצג את הכפתור רק אם זה מכשיר נייד, iOS ולא standalone
  const shouldShow = addToHomeButton && isMobile() && isIOS() && !isStandalone();
  
  if (shouldShow) {
    showInstallButton('ios-add-to-home');
    console.log('✅ iOS Button should be visible now');
    
    // בדיקה נוספת - וודא שהכפתור באמת נראה
    setTimeout(() => {
      const computedStyle = window.getComputedStyle(addToHomeButton);
      console.log('Button computed display:', computedStyle.display);
      console.log('Button computed visibility:', computedStyle.visibility);
      console.log('Button computed opacity:', computedStyle.opacity);
      console.log('Button position:', computedStyle.position);
      console.log('Button z-index:', computedStyle.zIndex);
    }, 100);
  } else {
    logInstallFailure([
      { condition: !addToHomeButton, message: 'Button element not found' },
      { condition: !isMobile(), message: 'Not mobile device' },
      { condition: !isIOS(), message: 'Not iOS device' },
      { condition: isStandalone(), message: 'Already in standalone mode' }
    ]);
  }
}

function showAndroidInstallButton() {
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  if (isStandalone()) {
    console.log('🚫 Android Install Button - App already installed, skipping');
    return;
  }
  
  const androidInstallButton = document.querySelector(CONFIG.SELECTORS.ANDROID_BUTTON);
  const addToHomeButton = document.querySelector(CONFIG.SELECTORS.IOS_BUTTON);

  logInstallDebug('Android Install', {
    'isMobile()': isMobile(),
    'isAndroid()': isAndroid(),
    'isAndroidAppInstalled()': isAndroidAppInstalled(),
    'isStandalone()': isStandalone(),
    'Android button found': !!androidInstallButton
  });
  
  // קדימות לחנות: אם אפשר להציג כפתור חנות - הסתר את כפתור ה-PWA
  const shouldShow = androidInstallButton && isMobile() && isAndroid() && !isAndroidAppInstalled() && !isStandalone();

  if (shouldShow) {
    showInstallButton('android-install');
    console.log('✅ Android Install Button should be visible now');
  } else {
    logInstallFailure([
      { condition: !androidInstallButton, message: 'Button element not found' },
      { condition: !isMobile(), message: 'Not mobile device' },
      { condition: !isAndroid(), message: 'Not Android device' },
      { condition: isAndroidAppInstalled(), message: 'Android app already installed' },
      { condition: isStandalone(), message: 'Already in app mode' }
    ]);
  }
}

function installAndroidApp() {
  console.log('Opening Play Store:', CONFIG.URLS.PLAY_STORE);
  window.open(CONFIG.URLS.PLAY_STORE, '_blank');
}

function showAddToHomeInstructions() {
  const overlay = document.querySelector(CONFIG.SELECTORS.OVERLAY);
  const instructions = document.querySelector(CONFIG.SELECTORS.INSTRUCTIONS);
  
  if (overlay && instructions) {
    overlay.style.display = 'block';
    instructions.style.display = 'block';
  }
}

function hideAddToHomeInstructions() {
  const overlay = document.querySelector(CONFIG.SELECTORS.OVERLAY);
  const instructions = document.querySelector(CONFIG.SELECTORS.INSTRUCTIONS);
  
  if (overlay && instructions) {
    overlay.style.display = 'none';
    instructions.style.display = 'none';
  }
}

// הוספת פונקציות לחלון הגלובלי
window.showAddToHomeInstructions = showAddToHomeInstructions;
window.hideAddToHomeInstructions = hideAddToHomeInstructions;
window.installAndroidApp = installAndroidApp;
window.installPWA = installPWA;

// הוספת event listener לסגירת ההודעות בלחיצה על הרקע
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.querySelector(CONFIG.SELECTORS.OVERLAY);
  if (overlay) {
    overlay.addEventListener('click', hideAddToHomeInstructions);
  }
});
