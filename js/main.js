// קובץ ראשי - ניהול האפליקציה
async function init() {
  console.log('🚀 init() function called');
  
  // הסתר את כל כפתורי ההתקנה אם האפליקציה כבר מותקנת
  if (isStandalone()) {
    console.log('🚫 App already installed - hiding all install buttons');
    hideInstallButtons();
  }
  
  appState.setLoading(true);
  
  let stations;
  try {
    const data = await fetchSheetData();
    stations = parseStations(data.table);
    if (!stations || stations.length === 0) {
      appState.showError(CONFIG.MESSAGES.NO_STATIONS_FOUND);
      return;
    }
    console.log(`נטענו ${stations.length} תחנות מהגיליון`);
  } catch (err) {
    appState.showError(`אירעה שגיאה בטעינת הנתונים: ${err.message}`);
    console.error("Error loading data:", err);
    return;
  }

  // הגדרת התחנות מיד לאחר הטעינה - מאפשר חיפוש מיידי
  appState.setStations(stations);
  
  // הצגת כל התחנות בהתחלה (ללא מיון לפי מרחק)
  appState.setLoading(false);
  renderStations(stations, null);
  
  // הפעלת חיפוש מיד
  setupControls();

  // הצגת כפתורי התקנה רק אם האפליקציה לא מותקנת
  if (!isStandalone()) {
    console.log('📱 About to call showIOSAddToHomeButton()');
    showIOSAddToHomeButton();
    showAndroidInstallButton(); // הוספת כפתור לאנדרואיד
    
    // בדיקה נוספת לכפתור PWA - וודא שהוא לא מופיע אם האפליקציה מותקנת
    const pwaInstallButton = document.getElementById('pwa-install');
    if (pwaInstallButton) {
      // הסתר את הכפתור אם זה לא מכשיר נייד או אם האפליקציה מותקנת
      if (!isMobile() || isStandalone()) {
        pwaInstallButton.style.display = 'none';
        console.log('🚫 PWA Install Button hidden - not mobile or app already installed');
      }
    }
  } else {
    console.log('🚫 App already installed - skipping install button checks');
  }

  // בקשת מיקום במקביל (לא חוסמת)
  requestGeolocation(stations);

  // רענון מיקום אוטומטי כל דקה
  if (CONFIG.GEOLOCATION_REFRESH_MS > 0) {
    setInterval(() => {
      const stations = appState.getStations();
      if (stations && stations.length > 0) {
        requestGeolocation(stations);
      }
    }, CONFIG.GEOLOCATION_REFRESH_MS);
  }
}

// טיפול במצב online/offline
window.addEventListener('online', function() {
  console.log('🟢 Connection restored');
  const offlineMessage = document.getElementById('offline-message');
  if (offlineMessage) {
    offlineMessage.style.display = 'none';
  }
  
  // רענון נתונים אם אין תחנות
  const stations = appState.getStations();
  if (!stations || stations.length === 0) {
    init();
  }
});

window.addEventListener('offline', function() {
  console.log('🔴 Connection lost');
  const offlineMessage = document.getElementById('offline-message');
  if (offlineMessage) {
    offlineMessage.style.display = 'block';
  }
});

document.addEventListener("DOMContentLoaded", init);
