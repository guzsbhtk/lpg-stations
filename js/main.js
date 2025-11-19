// קובץ ראשי - ניהול האפליקציה
async function init() {
  console.log('🚀 init() function called');

  // הסתר את כל כפתורי ההתקנה אם האפליקציה כבר מותקנת
  if (isStandalone()) {
    console.log('🚫 App already installed - hiding all install buttons');
    hideInstallButtons();
  }

  appState.setLoading(true);

  // 1. נסה לטעון מהמטמון קודם (לביצועים מהירים)
  const cachedStations = getStationsFromCache();
  if (cachedStations && cachedStations.length > 0) {
    console.log(`📦 Loaded ${cachedStations.length} stations from cache`);
    appState.setStations(cachedStations);
    appState.setLoading(false);
    renderStations(cachedStations, null);
    // הפעל חיפוש מיד אם יש נתונים
    setupControls();
  }

  // 2. טען נתונים עדכניים מהרשת
  try {
    const data = await fetchSheetData();
    const stations = parseStations(data.table);

    if (!stations || stations.length === 0) {
      // אם אין נתונים חדשים אבל יש ישנים, נשאר עם הישנים
      if (!cachedStations) {
        appState.showError(CONFIG.MESSAGES.NO_STATIONS_FOUND);
      }
      return;
    }

    console.log(`🌐 Loaded ${stations.length} stations from network`);

    // שמור למטמון
    saveStationsToCache(stations);

    // עדכן את המצב והתצוגה
    appState.setStations(stations);
    appState.setLoading(false);

    // אם כבר יש מיקום, נחשב מרחקים מחדש
    const userPos = appState.getUserPosition();
    if (userPos) {
      stations.forEach(
        (st) => (st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng))
      );
      stations.sort((a, b) => a.distance - b.distance);
    }

    // רינדור מחדש (רק אם זה שונה או אם לא היה קאש)
    // כרגע נרנדר תמיד כדי לוודא שהכל מעודכן
    if (userPos) {
      // אם יש מיקום, applyFilters כבר יטפל ברינדור
      applyFilters();
    } else {
      renderStations(stations, null);
    }

  } catch (err) {
    console.error("Error loading data:", err);

    // אם אין לנו נתונים בכלל (גם לא בקאש), נציג שגיאה
    if (!cachedStations || cachedStations.length === 0) {
      appState.showError(`אירעה שגיאה בטעינת הנתונים: ${err.message}`);
    } else {
      console.log('⚠️ Network failed, but using cached data');
      // אולי כדאי להציג אינדיקציה שהמידע לא מעודכן? כרגע נשאיר ככה
    }
    return;
  }

  // אם לא היה קאש, עכשיו הזמן להפעיל את הפקדים
  if (!cachedStations) {
    setupControls();
  }

  // הצגת כפתורי התקנה רק אם האפליקציה לא מותקנת
  if (!isStandalone()) {
    console.log('📱 About to call showIOSAddToHomeButton()');
    showIOSAddToHomeButton();
    showAndroidInstallButton(); // הוספת כפתור לאנדרואיד

    // בדיקה נוספת לכפתור PWA
    const pwaInstallButton = document.getElementById('pwa-install');
    if (pwaInstallButton) {
      if (!isMobile() || isStandalone() || (isAndroid() && hasGooglePlayServices())) {
        pwaInstallButton.style.display = 'none';
        console.log('🚫 PWA Install Button hidden - not mobile, app already installed, or Android with Google Play Services');
      }
    }
  } else {
    console.log('🚫 App already installed - skipping install button checks');
  }

  // בקשת מיקום במקביל (לא חוסמת)
  // הפונקציה הזו תקרא ל-applyFilters() כשתסתיים, וזה יעבוד מהר
  requestGeolocation(appState.getStations());

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
window.addEventListener('online', function () {
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

window.addEventListener('offline', function () {
  console.log('🔴 Connection lost');
  const offlineMessage = document.getElementById('offline-message');
  if (offlineMessage) {
    offlineMessage.style.display = 'block';
  }
});

document.addEventListener("DOMContentLoaded", init);

// Service Worker Registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(console.error);
}