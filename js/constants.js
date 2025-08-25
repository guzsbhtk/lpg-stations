// קבועים ותצורה
const CONFIG = {
  GEOLOCATION_TIMEOUT: 60000,
  MAX_STATIONS_DISPLAY: 10,
  UPDATE_DISTANCE_THRESHOLD: 1,
  EARTH_RADIUS_KM: 6371,
  GEOLOCATION_MAX_AGE_HIGH: 30000,
  GEOLOCATION_MAX_AGE_LOW: 600000,
  GEOLOCATION_REFRESH_MS: 60000,
  
  // Timeouts
  FETCH_TIMEOUT: 15000,
  GEOLOCATION_RETRY_DELAY: 1000,
  UI_DEBUG_DELAY: 100,
  
  // Search & Filtering (חיפוש וסינון)
  SEARCH: {
    MIN_LENGTH_FOR_FUZZY: 4, // אורך מינימלי לחיפוש עם סובלנות לשגיאות
    MAX_LEVENSHTEIN_DISTANCE: 3, // מספר שגיאות מקסימלי בחיפוש (גמישות)
  },
  
  // Security (אבטחה)
  SECURITY: {
    ROW_CODE_MULTIPLIER: 'rowNumber * rowNumber', // n²
    DAY_SUFFIX_MULTIPLIER: 2, 
    DAY_SUFFIX_PREFIX: '.' // נקודה לפני
  },
  
  // DOM selectors
  SELECTORS: {
    STATUS: "#status",
    STATIONS_CONTAINER: "#stations",
    SEARCH_INPUT: "#search",
    DISTANCE_RANGE: "#distanceRange",
    DISTANCE_VALUE: "#distanceValue",
    SORT_SELECT: "#sortBy",
    IOS_BUTTON: "#ios-add-to-home",
    ANDROID_BUTTON: "#android-install",
    PWA_BUTTON: "#pwa-install",
    OVERLAY: "#overlay",
    INSTRUCTIONS: "#add-to-home-instructions"
  },
  
  // URLs
  URLS: {
    SHEET: "https://docs.google.com/spreadsheets/d/1FDx3CdFpCLxQAKFRqQ1DpiF8l6k46L6M6hWoahuGB30/gviz/tq?tqx=out:json",
    UPDATE_FORM_BASE: "https://docs.google.com/forms/d/e/1FAIpQLSdVxdEhqTyuI9wytoStlha4twnct3misgfuzZj04Fx6W9bvaQ/viewform?usp=pp_url&entry.1345625893=",
    PLAY_STORE: "https://play.google.com/store/apps/details?id=io.github.guzsbhtk.twa"
  },
  
  // Messages
  MESSAGES: {
    NO_STATIONS: "אין תחנות להצגה",
    NO_SEARCH_RESULTS: "לא נמצאו תחנות התואמות לחיפוש",
    LOADING: "מביא נתונים מהגיליון…",
    LOADING_LOCATION: "מציג תחנות... מבקש נתוני מיקום לחישוב מרחקים",
    NO_STATIONS_FOUND: "לא נמצאו תחנות בגיליון",
    GEOLOCATION_NOT_SUPPORTED: "הדפדפן לא תומך במיקום – מציג רשימה ללא סינון"
  }
};

// קבועי שגיאות Geolocation
const GEOLOCATION_ERRORS = {
  1: 'PERMISSION_DENIED - המשתמש דחה את הבקשה למיקום',
  2: 'POSITION_UNAVAILABLE - לא ניתן לקבל מיקום (אין GPS/WiFi/סלולר)',
  3: 'TIMEOUT - הבקשה חרגה ממגבלת הזמן'
};

// קבועי הודעות שגיאה למשתמש
const USER_ERROR_MESSAGES = {
  1: "לא אושרה גישה למיקום",
  2: "לא התקבלו נתוני מיקום", 
  3: "הבקשה לקבלת מיקום חרגה ממגבלת הזמן"
};
