// זיהוי מכשירים ופלטפורמות
function isMobile() {
  const userAgent = navigator.userAgent;
  const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTouchDevice = 'ontouchstart' in window;
  
  console.log('Mobile Detection:', {
    userAgent,
    isMobileDevice,
    isTouchDevice,
    result: isMobileDevice || isTouchDevice
  });
  
  return isMobileDevice || isTouchDevice;
}

function isIOS() {
  const userAgent = navigator.userAgent;
  const isIPad = /iPad/.test(userAgent);
  const isIPhone = /iPhone/.test(userAgent);
  const isIPod = /iPod/.test(userAgent);
  const isMac = /Mac/.test(userAgent);
  const isTouch = 'ontouchend' in document;
  
  // iPad M1 מזוהה לפעמים כ-Mac עם touch
  const isIPadM1 = isMac && isTouch;
  
  const result = (isIPad || isIPhone || isIPod || isIPadM1) && !window.MSStream;
  
  console.log('iOS Detection Debug:', {
    userAgent,
    isIPad,
    isIPhone, 
    isIPod,
    isMac,
    isTouch,
    isIPadM1,
    result
  });
  
  return result;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function isAndroidAppInstalled() {
  // בדיקה אם האפליקציה מותקנת באנדרואיד
  const userAgent = navigator.userAgent;
  
  // בדיקות שונות לזיהוי אם האפליקציה מותקנת
  const isInTWA = window.navigator.standalone === true;
  const hasAndroidIntent = 'Android' in window && window.Android;
  const hasTWAFeatures = 'beforeinstallprompt' in window;
  
  // בדיקה אם זה TWA (Trusted Web Activity)
  const isTWAMode = userAgent.includes('wv') || userAgent.includes('TWA');
  
  // בדיקה אם זה WebView של האפליקציה
  const isInWebView = userAgent.includes('wv') || userAgent.includes('Mobile') && userAgent.includes('Safari') && !userAgent.includes('Chrome');
  
  // בדיקה אם יש תכונות של אפליקציה מותקנת
  const hasAppFeatures = 'serviceWorker' in navigator && 'PushManager' in window;
  
  const result = isInTWA || hasAndroidIntent || isTWAMode || isInWebView;
  
  console.log('Android App Detection:', {
    userAgent,
    isInTWA,
    hasAndroidIntent,
    hasTWAFeatures,
    isTWAMode,
    isInWebView,
    hasAppFeatures,
    result
  });
  
  return result;
}

function isStandalone() {
  return window.navigator.standalone === true || 
         window.location.href.includes('android-app://') ||
         document.referrer.includes('android-app://') ||
         window.navigator.userAgent.includes('wv') ||
         window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: window-controls-overlay)').matches;
}
