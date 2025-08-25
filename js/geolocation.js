// ניהול מיקום גיאוגרפי

// חישוב מרחק לפי נוסחת האברסין
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = CONFIG.EARTH_RADIUS_KM; // רדיוס כדור הארץ בק"מ
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// פונקציה נפרדת לבקשת מיקום שרצה במקביל
function requestGeolocation(stations) {
  if (navigator.geolocation) {
    console.log('🔍 Geolocation Debug:', {
      isDesktop: !isMobile(),
      isMobile: isMobile(),
      isIOS: isIOS(),
      isStandalone: isStandalone(),
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      isSecure: window.location.protocol === 'https:',
      permissions: 'permissions' in navigator,
      userAgent: navigator.userAgent.substring(0, 100) + '...'
    });
    
    // בדיקת הרשאות אם זמין
    if ('permissions' in navigator) {
      navigator.permissions.query({name: 'geolocation'}).then((result) => {
        console.log('🔐 Geolocation permission state:', result.state);
      }).catch((err) => {
        console.log('🔐 Cannot check geolocation permissions:', err);
      });
    }
    
    // נתחיל עם הגדרות פשוטות
    const simpleOptions = {
      enableHighAccuracy: false,
      timeout: CONFIG.GEOLOCATION_TIMEOUT / 6,
      maximumAge: 0
    };
    
    const accurateOptions = {
      enableHighAccuracy: true,
      timeout: CONFIG.GEOLOCATION_TIMEOUT / 4,
      maximumAge: 0
    };
    
    let attemptCount = 0;
    const maxAttempts = 3;
    
    const tryGeolocation = () => {
      attemptCount++;
      console.log(`🎯 Geolocation attempt ${attemptCount}/${maxAttempts}`);
      
      // בחירת אפשרויות לפי ניסיון
      let currentOptions;
      if (attemptCount === 1) {
        currentOptions = simpleOptions; // ניסיון ראשון - פשוט ומהיר
      } else if (attemptCount === 2) {
        currentOptions = accurateOptions; // ניסיון שני - מדויק יותר
      } else {
        currentOptions = { enableHighAccuracy: false, timeout: CONFIG.GEOLOCATION_TIMEOUT / 2, maximumAge: CONFIG.GEOLOCATION_MAX_AGE_LOW / 2 }; // ניסיון אחרון - סבלני
      }
      
      console.log(`Using options:`, currentOptions);
      
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('✅ Geolocation success!', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude,
            altitudeAccuracy: pos.coords.altitudeAccuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp
          });
          const userPos = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          // חישוב מרחקים לכל התחנות
          stations.forEach(
            (st) => (st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng))
          );
          stations.sort((a, b) => a.distance - b.distance);
          appState.setStations(stations);
          appState.setUserPosition(userPos);
          
          const statusEl = appState.getElement('status');
          if (statusEl) statusEl.textContent = "";
          
          // עדכון התצוגה עם מרחקים אם אין חיפוש פעיל
          const searchInput = appState.getElement('searchInput');
          if (!searchInput.value.trim()) {
            renderStations(stations.slice(0, CONFIG.MAX_STATIONS_DISPLAY), userPos);
          } else {
            // אם יש חיפוש פעיל, הרץ אותו מחדש עם המרחקים החדשים
            applyFilters();
          }
        },
        (err) => {
          console.warn(`❌ Geolocation attempt ${attemptCount} failed:`, {
            code: err.code,
            message: err.message,
            timestamp: Date.now(),
            options: currentOptions
          });
          
          // פירוט השגיאה
          const errorDetails = {
            1: 'PERMISSION_DENIED - המשתמש דחה את הבקשה למיקום',
            2: 'POSITION_UNAVAILABLE - לא ניתן לקבל מיקום (אין GPS/WiFi/סלולר)',
            3: 'TIMEOUT - הבקשה חרגה ממגבלת הזמן'
          };
          console.log(`📋 Error details: ${errorDetails[err.code] || 'Unknown error'}`);
          
          if (attemptCount < maxAttempts) {
            console.log(`⏳ Trying again in ${CONFIG.GEOLOCATION_RETRY_DELAY}ms...`);
            setTimeout(tryGeolocation, CONFIG.GEOLOCATION_RETRY_DELAY);
          } else {
            console.log('🚫 All geolocation attempts failed');
            appState.showError(`${geoErrorText(err.code)} – מציג רשימה מלאה`);
          }
        },
        currentOptions
      );
    };
    
    // התחלת הניסיונות
    tryGeolocation();
  } else {
    appState.showError(CONFIG.MESSAGES.GEOLOCATION_NOT_SUPPORTED);
    // התחנות כבר מוצגות, רק נעדכן את הסטטוס
  }
}

// תרגום קודי השגיאה של geolocation להודעות מובנות למשתמש
function geoErrorText(code) {
  return USER_ERROR_MESSAGES[code] || "שגיאה לא ידועה בקבלת מיקום";
}
