// ניהול התקנת PWA
let deferredPrompt;

// בדיקה אם האפליקציה מותקנת (גם אם נכנסים דרך הדפדפן)
async function isAppInstalled() {
  // 1. בדיקה אם רצים ב-standalone mode
  if (isStandalone()) {
    console.log('✅ App installed - running in standalone mode');
    return true;
  }
  
  // 2. בדיקה אם המשתמש כבר התקין בעבר (localStorage)
  try {
    const installedFlag = localStorage.getItem('app-installed');
    if (installedFlag === 'true') {
      console.log('✅ App installed - localStorage flag');
      return true;
    }
  } catch (e) {
    console.log('localStorage check failed:', e);
  }
  
  // 3. שימוש ב-getInstalledRelatedApps API (Chrome Android)
  if ('getInstalledRelatedApps' in navigator) {
    try {
      const relatedApps = await navigator.getInstalledRelatedApps();
      console.log('📱 Related apps check:', relatedApps);
      if (relatedApps && relatedApps.length > 0) {
        // שמירה ב-localStorage למהירות בפעמים הבאות
        try {
          localStorage.setItem('app-installed', 'true');
        } catch (e) {}
        console.log('✅ App installed - found via getInstalledRelatedApps');
        return true;
      }
    } catch (error) {
      console.log('getInstalledRelatedApps check failed:', error);
    }
  }
  
  console.log('❌ App not installed');
  return false;
}

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

// כאשר האפליקציה מותקנת בהצלחה
window.addEventListener('appinstalled', (e) => {
  console.log('✅ PWA installed successfully');
  // שמירה ב-localStorage שהאפליקציה מותקנת
  try {
    localStorage.setItem('app-installed', 'true');
  } catch (e) {
    console.log('Failed to save install flag:', e);
  }
  // הסתרת כפתורי ההתקנה
  hideInstallButtons();
});

async function showPWAInstallButton() {
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  const appInstalled = await isAppInstalled();
  if (appInstalled) {
    console.log('🚫 PWA Install Button - App already installed, skipping');
    return;
  }
  
  // באנדרואיד עם שירותי גוגל: הבדיקה בוטלה לבקשת המשתמש כדי לאפשר התקנת PWA ישירה
  // if (isAndroid() && hasGooglePlayServices()) {
  //   const pwaInstallButton = document.getElementById('pwa-install');
  //   if (pwaInstallButton) {
  //     pwaInstallButton.style.display = 'none';
  //   }
  //   console.log('🚫 PWA Install Button hidden on Android with Google Play Services (preferring native app download)');
  //   return;
  // }
  
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
        // שמירה ב-localStorage שהמשתמש התקין
        try {
          localStorage.setItem('app-installed', 'true');
        } catch (e) {
          console.log('Failed to save install flag:', e);
        }
      } else {
        console.log('PWA installation declined');
      }
      deferredPrompt = null;
    });
  }
}

async function showIOSAddToHomeButton() {
  // בדיקה אם המשתמש ביקש להסתיר את הכפתור לצמיתות
  try {
    const hideIOSButton = localStorage.getItem('hide-ios-button');
    if (hideIOSButton === 'true') {
      console.log('🚫 iOS Add to Home Button - User requested to hide permanently');
      return;
    }
  } catch (e) {
    console.log('Failed to check hide-ios-button flag:', e);
  }
  
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  const appInstalled = await isAppInstalled();
  if (appInstalled) {
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
    showInstallButton('#ios-add-to-home');
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

async function showAndroidInstallButton() {
  // בדיקה מוקדמת - אם האפליקציה מותקנת, אל תציג שום כפתור
  const appInstalled = await isAppInstalled();
  if (appInstalled) {
    console.log('🚫 Android Install Button - App already installed, skipping');
    return;
  }
  
  const androidInstallButton = document.querySelector(CONFIG.SELECTORS.ANDROID_BUTTON);
  const addToHomeButton = document.querySelector(CONFIG.SELECTORS.IOS_BUTTON);

  logInstallDebug('Android Install', {
    'isMobile()': isMobile(),
    'isAndroid()': isAndroid(),
    'hasGooglePlayServices()': hasGooglePlayServices(),
    'isAndroidAppInstalled()': isAndroidAppInstalled(),
    'isStandalone()': isStandalone(),
    'Android button found': !!androidInstallButton
  });
  
  // קדימות לחנות: אם אפשר להציג כפתור חנות - הסתר את כפתור ה-PWA
  const shouldShow = androidInstallButton && isMobile() && isAndroid() && hasGooglePlayServices() && !isAndroidAppInstalled() && !isStandalone();

  if (shouldShow) {
    showInstallButton('#android-install');
    console.log('✅ Android Install Button should be visible now');
  } else {
    logInstallFailure([
      { condition: !androidInstallButton, message: 'Button element not found' },
      { condition: !isMobile(), message: 'Not mobile device' },
      { condition: !isAndroid(), message: 'Not Android device' },
      { condition: !hasGooglePlayServices(), message: 'No Google Play Services' },
      { condition: isAndroidAppInstalled(), message: 'Android app already installed' },
      { condition: isStandalone(), message: 'Already in app mode' }
    ]);
  }
}

function installAndroidApp() {
  console.log('Opening Play Store:', CONFIG.URLS.PLAY_STORE);
  // שמירה שהמשתמש לחץ להתקין (ככל הנראה יתקין)
  try {
    localStorage.setItem('app-install-clicked', 'true');
  } catch (e) {
    console.log('Failed to save install click flag:', e);
  }
  window.open(CONFIG.URLS.PLAY_STORE, '_blank');
}

function showAddToHomeInstructions() {
  const overlay = document.querySelector(CONFIG.SELECTORS.OVERLAY);
  const instructions = document.querySelector(CONFIG.SELECTORS.INSTRUCTIONS);
  
  // שמירה שהמשתמש ראה את ההוראות (ככל הנראה יתקין)
  try {
    localStorage.setItem('app-install-clicked', 'true');
  } catch (e) {
    console.log('Failed to save install click flag:', e);
  }
  
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

function hideIOSButtonPermanently() {
  console.log('🚫 User requested to hide iOS button permanently');
  
  // שמירה ב-localStorage שהמשתמש לא רוצה לראות את הכפתור
  try {
    localStorage.setItem('hide-ios-button', 'true');
    console.log('✅ Hide flag saved');
  } catch (e) {
    console.log('Failed to save hide-ios-button flag:', e);
  }
  
  // סגירת חלון ההוראות
  hideAddToHomeInstructions();
  
  // הסתרת הכפתור מיידית
  const iosButton = document.querySelector(CONFIG.SELECTORS.IOS_BUTTON);
  if (iosButton) {
    iosButton.style.display = 'none';
    console.log('✅ iOS button hidden');
  }
}

// הוספת פונקציות לחלון הגלובלי
window.showAddToHomeInstructions = showAddToHomeInstructions;
window.hideAddToHomeInstructions = hideAddToHomeInstructions;
window.hideIOSButtonPermanently = hideIOSButtonPermanently;
window.installAndroidApp = installAndroidApp;
window.installPWA = installPWA;

// בדיקה אוטומטית בטעינת הדף - זיהוי משתמשים שהתקינו בעבר
async function checkAndSaveAppInstalled() {
  try {
    // אם כבר יש דגל שמור - לא צריך לבדוק שוב
    const existingFlag = localStorage.getItem('app-installed');
    if (existingFlag === 'true') {
      console.log('✅ App install flag already exists');
      return;
    }
    
    // בדיקה אם האפליקציה מותקנת
    const installed = await isAppInstalled();
    if (installed) {
      console.log('🔍 Detected previously installed app - saving flag');
      localStorage.setItem('app-installed', 'true');
    }
  } catch (e) {
    console.log('Failed to check app installation status:', e);
  }
}

// הוספת event listener לסגירת ההודעות בלחיצה על הרקע
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.querySelector(CONFIG.SELECTORS.OVERLAY);
  if (overlay) {
    overlay.addEventListener('click', hideAddToHomeInstructions);
  }
  
  // בדיקה אוטומטית אם האפליקציה מותקנת
  checkAndSaveAppInstalled();
});
