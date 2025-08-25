// ניהול מיקום גיאוגרפי
const CONFIG = {
  GEOLOCATION_TIMEOUT: 60000,
  MAX_STATIONS_DISPLAY: 10,
  UPDATE_DISTANCE_THRESHOLD: 1,
  EARTH_RADIUS_KM: 6371,
  GEOLOCATION_MAX_AGE_HIGH: 30000,
  GEOLOCATION_MAX_AGE_LOW: 600000,
  // רענון מיקום כל דקה (60 שניות)
  GEOLOCATION_REFRESH_MS: 60000
};

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
      timeout: 10000,
      maximumAge: 0
    };
    
    const accurateOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
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
        currentOptions = { enableHighAccuracy: false, timeout: 30000, maximumAge: 300000 }; // ניסיון אחרון - סבלני
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
          allStations = stations;
          userPosGlobal = userPos;
          statusEl.textContent = "";
          // עדכון התצוגה עם מרחקים אם אין חיפוש פעיל
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
            console.log(`⏳ Trying again in 1 second...`);
            setTimeout(tryGeolocation, 1000);
          } else {
            console.log('🚫 All geolocation attempts failed');
            statusEl.innerHTML = `<div class="error-message" role="alert">${geoErrorText(err.code)} – מציג רשימה מלאה</div>`;
          }
        },
        currentOptions
      );
    };
    
    // התחלת הניסיונות
    tryGeolocation();
  } else {
    statusEl.innerHTML = '<div class="error-message" role="alert">הדפדפן לא תומך במיקום – מציג רשימה ללא סינון</div>';
    // התחנות כבר מוצגות, רק נעדכן את הסטטוס
  }
}

// תרגום קודי השגיאה של geolocation להודעות מובנות למשתמש
function geoErrorText(code) {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return "לא אושרה גישה למיקום";
    case 2: // POSITION_UNAVAILABLE
      return "לא התקבלו נתוני מיקום";
    case 3: // TIMEOUT
      return "הבקשה לקבלת מיקום חרגה ממגבלת הזמן";
    default:
      return "שגיאה לא ידועה בקבלת מיקום";
  }
}
