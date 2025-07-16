// URL של הגיליון (GViz API)
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1FDx3CdFpCLxQAKFRqQ1DpiF8l6k46L6M6hWoahuGB30/gviz/tq?tqx=out:json";

// קבועים
const CONFIG = {
  GEOLOCATION_TIMEOUT: 60000,
  MAX_STATIONS_DISPLAY: 10,
  UPDATE_DISTANCE_THRESHOLD: 1,
  EARTH_RADIUS_KM: 6371,
  GEOLOCATION_MAX_AGE_HIGH: 30000,
  GEOLOCATION_MAX_AGE_LOW: 600000,
  // רענון מיקום כל דקה וחצי (90 שניות)
  GEOLOCATION_REFRESH_MS: 90000
};

const statusEl = document.getElementById("status");
const stationsContainer = document.getElementById("stations");
const searchInput = document.getElementById("search");
const distanceRange = document.getElementById("distanceRange");
const distanceValue = document.getElementById("distanceValue");
const sortSelect = document.getElementById("sortBy");

let allStations = [];
let userPosGlobal = null;

// כפתור בקשת מיקום יזומה
const requestLocationBtn = document.getElementById("request-location-btn");
if (requestLocationBtn) {
  requestLocationBtn.addEventListener("click", () => {
    requestLocationBtn.disabled = true;
    requestLocationBtn.textContent = "מנסה לקבל מיקום...";
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          requestLocationBtn.disabled = false;
          requestLocationBtn.textContent = "אפשר מיקום";
          // עדכון התחנות עם המיקום שהתקבל
          if (allStations && allStations.length > 0) {
            const userPos = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            };
            allStations.forEach(
              (st) => (st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng))
            );
            allStations.sort((a, b) => a.distance - b.distance);
            userPosGlobal = userPos;
            renderStations(allStations.slice(0, CONFIG.MAX_STATIONS_DISPLAY), userPos);
          }
          statusEl.textContent = "";
        },
        (err) => {
          requestLocationBtn.disabled = false;
          requestLocationBtn.textContent = "אפשר מיקום";
          statusEl.innerHTML = `${geoErrorText(err.code)} – מציג רשימה מלאה`;
        }
      );
    } else {
      requestLocationBtn.disabled = false;
      requestLocationBtn.textContent = "אפשר מיקום";
      statusEl.textContent = "הדפדפן לא תומך במיקום – מציג רשימה ללא סינון";
    }
  });
}

// פונקציה בטוחה לפיענוח תגובת GViz
function parseGVizResponse(text) {
  try {
    const start = text.indexOf('{"');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('Invalid GViz response format');
    }
    const jsonStr = text.substring(start, end + 1);
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse GViz response:', err);
    throw new Error('לא ניתן לפענח את תגובת השרת');
  }
}

// נרמול טקסט עברי לחיפוש - התעלמות מהבדלים קטנים
function normalizeHebrewText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    // החלפת אותיות דומות
    .replace(/[יִי]/g, 'י')  // יו"ד ויו"ד עם נקודות
    .replace(/[וו]/g, 'ו')   // ו' רגיל וו' עם נקודות
    .replace(/[בב]/g, 'ב')   // ב' רגיל וב' עם נקודות
    .replace(/[כך]/g, 'כ')   // כ' רגיל וכ' סופית
    .replace(/[מם]/g, 'מ')   // מ' רגיל ומ' סופית
    .replace(/[נן]/g, 'ן')   // נ' רגיל ונ' סופית
    .replace(/[פף]/g, 'פ')   // פ' רגיל ופ' סופית
    .replace(/[צץ]/g, 'צ')   // צ' רגיל וצ' סופית
    .replace(/[תט]/g, 'ת')   // ת' וט' (לפעמים מתחלפות)
    // הסרת רווחים מיותרים ונקודות
    .replace(/\s+/g, ' ')
    .replace(/[.,\-_]/g, '')
    .trim();
}

// חיפוש מתקדם עם דמיון טקסט
function isTextMatch(searchTerm, targetText) {
  const normalizedSearch = normalizeHebrewText(searchTerm);
  const normalizedTarget = normalizeHebrewText(targetText);
  
  // חיפוש רגיל - מכיל את המחרוזת
  if (normalizedTarget.includes(normalizedSearch)) {
    return true;
  }
  
  // חיפוש בתחילת מילים - לדוגמה "קרית ש" ימצא "קריית שמונה"
  const targetWords = normalizedTarget.split(' ');
  const searchWords = normalizedSearch.split(' ');
  
  // בדיקה אם כל מילות החיפוש מופיעות בתחילת מילים ברצף
  for (let i = 0; i <= targetWords.length - searchWords.length; i++) {
    let allMatch = true;
    for (let j = 0; j < searchWords.length; j++) {
      const targetWord = targetWords[i + j];
      const searchWord = searchWords[j];
      
      // בדיקה אם המילה מתחילה עם מילת החיפוש
      if (!targetWord.startsWith(searchWord)) {
        allMatch = false;
        break;
      }
    }
    if (allMatch) {
      return true;
    }
  }
  
  // חיפוש עם סובלנות לשגיאה אחת (Levenshtein distance)
  if (normalizedSearch.length >= 3) {
    return levenshteinDistance(normalizedSearch, normalizedTarget) <= 1 ||
           normalizedTarget.split(' ').some(word => 
             levenshteinDistance(normalizedSearch, word) <= 1
           );
  }
  
  return false;
}

// חישוב מרחק לוונשטיין (Levenshtein distance) - מספר שינויים מינימלי
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// בדיקת תקינות נתוני תחנה
function validateStation(station) {
  if (!station.name || !station.price || !station.lat || !station.lng) {
    return false;
  }
  if (typeof station.price !== 'number' || station.price <= 0 || station.price > 20) {
    console.warn('Suspicious price for station:', station.name, station.price);
  }
  if (typeof station.lat !== 'number' || typeof station.lng !== 'number' ||
      Math.abs(station.lat) > 90 || Math.abs(station.lng) > 180) {
    return false;
  }
  return true;
}

// פונקציה להבאת הנתונים מהגיליון
async function fetchSheetData() {
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const text = await res.text();
    const data = parseGVizResponse(text);
    return data;
  } catch (err) {
    console.error("שגיאה בשליפת נתונים", err);
    throw err;
  }
}

// פענוח הנתונים לג’ייסון של תחנות
function parseStations(table) {
  const cols = table.cols.map((c) => c.label || "");

  const findIdx = (keywords) =>
    cols.findIndex((l) => keywords.some((k) => l.includes(k)));

  const idxName = findIdx(["שם", "תחנה"]);
  const idxPrice = findIdx(["מחיר"]);
  const idxDate = findIdx(["תאריך", "מעודכן"]);
  const idxCityCandidates = ["ישוב", "יישוב", "עיר"];
  let idxCity = findIdx(idxCityCandidates);
  if (idxCity === -1 && cols.length > 1) {
    // ברירת מחדל – העמודה השנייה בגיליון מכילה לרוב את שם היישוב
    idxCity = 1;
  }
  const idxCoords = findIdx(["coords", "Latitude"]);

  if (idxName === -1 || idxPrice === -1 || idxCoords === -1) {
    throw new Error("לא נמצאו כל העמודות הנדרשות בגיליון");
  }

  function formatDateCell(cell) {
    if (!cell) return "";
    const raw = cell.f || cell.v;

    let month, year;

    const gvizMatch =
      typeof raw === "string" && raw.match(/Date\((\d+),(\d+),(\d+)/);
    if (gvizMatch) {
      year = parseInt(gvizMatch[1]);
      month = parseInt(gvizMatch[2]) + 1; // gviz חודש 0-based
    } else if (typeof raw === "string") {
      // נסה לפרק מחרוזת תאריך סטנדרטית dd/mm/yyyy
      const parts = raw.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
      if (parts) {
        month = parseInt(parts[2]);
        year = parseInt(parts[3]);
      }
    }

    if (!month || !year) {
      // fallback דרך Date()
      const d = new Date(raw);
      if (!isNaN(d)) {
        month = d.getMonth() + 1;
        year = d.getFullYear();
      }
    }

    if (!month || !year) return "";

    const monthStr = String(month).padStart(2, "0");
    const yearStr = String(year).slice(2);
    return `${monthStr}.${yearStr}`;
  }

  return table.rows
    .map((row, idx) => {
      const cells = row.c;
      const name = cells[idxName]?.v;
      const price = cells[idxPrice]?.v;
      const city = idxCity !== -1 ? cells[idxCity]?.v : "";
      const coordsStr = cells[idxCoords]?.v;
      const date = idxDate !== -1 ? formatDateCell(cells[idxDate]) : "";
      if (!name || !price || !coordsStr) return null;
      const [lat, lng] = coordsStr.split(/,\s*/).map(Number);
      if (isNaN(lat) || isNaN(lng)) return null;
      const rowNumber = idx + 2; // שורה בפועל בגיליון (כולל כותרת)
      const rowCode = `${rowNumber}${rowNumber * rowNumber}`; // שרשור n ו-n^2
      const station = { name, city, price, date, lat, lng, rowNumber, rowCode };
      return validateStation(station) ? station : null;
    })
    .filter(Boolean);
}

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

function renderStations(stations, userPos) {
  stationsContainer.innerHTML = "";
  const daySuffix = `.${new Date().getDate() * 2}`; // נקודה + יום*2
  stations.forEach((st) => {
    const div = document.createElement("div");
    div.className = "station";

    const UPDATE_FORM_BASE =
      "https://docs.google.com/forms/d/e/1FAIpQLSdVxdEhqTyuI9wytoStlha4twnct3misgfuzZj04Fx6W9bvaQ/viewform?usp=pp_url&entry.1345625893=";

    const title = document.createElement("h2");
    title.textContent = st.city ? `${st.name} ${st.city}` : st.name;
    div.appendChild(title);

    const priceEl = document.createElement("p");
    priceEl.className = "price";
    priceEl.textContent = `₪${st.price}`;

    if (st.date) {
      const dateSpan = document.createElement("span");
      dateSpan.className = "date";
      dateSpan.textContent = `  עודכן: ${st.date}`;
      priceEl.appendChild(dateSpan);
    }

    div.appendChild(priceEl);

    if (userPos) {
      const dist = st.distance !== undefined ? st.distance : distanceKm(userPos.lat, userPos.lng, st.lat, st.lng);
      const distEl = document.createElement("p");
      distEl.className = "distance";
      distEl.textContent = `${dist.toFixed(1)} ק"מ ממיקומך`;
      div.appendChild(distEl);
    }

    const actions = document.createElement("div");
    actions.className = "actions";

    const wazeLink = document.createElement("a");
    wazeLink.className = "waze";
    wazeLink.href = `https://waze.com/ul?ll=${st.lat}%2C${st.lng}&navigate=yes`;
    wazeLink.target = "_blank";
    wazeLink.rel = "noopener noreferrer";
    wazeLink.innerHTML = '<img src="icons/waze.svg" class="icon" alt=""> Waze';

    const mapsLink = document.createElement("a");
    mapsLink.className = "maps";
    mapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${st.lat}%2C${st.lng}`;
    mapsLink.target = "_blank";
    mapsLink.rel = "noopener noreferrer";
    mapsLink.innerHTML = '<img src="icons/maps.svg" class="icon" alt=""> Google Maps';

    actions.appendChild(wazeLink);
    actions.appendChild(mapsLink);

    // כפתור עדכון מחיר אם בטווח 1 ק"מ
    if (st.distance !== undefined && st.distance <= CONFIG.UPDATE_DISTANCE_THRESHOLD) {
      const updateLink = document.createElement("a");
      updateLink.className = "update";
      updateLink.href = UPDATE_FORM_BASE + st.rowCode + daySuffix;
      updateLink.target = "_blank";
      updateLink.rel = "noopener noreferrer";
      updateLink.textContent = "עדכן מחיר";
      actions.appendChild(updateLink);
    }

    div.appendChild(actions);

    stationsContainer.appendChild(div);
  });
}

async function init() {
  statusEl.textContent = "מביא נתונים מהגיליון…";
  let stations;
  try {
    const data = await fetchSheetData();
    stations = parseStations(data.table);
    if (!stations || stations.length === 0) {
      statusEl.textContent = "לא נמצאו תחנות בגיליון";
      return;
    }
    console.log(`נטענו ${stations.length} תחנות מהגיליון`);
  } catch (err) {
    statusEl.textContent = `אירעה שגיאה בטעינת הנתונים: ${err.message}`;
    console.error("Error loading data:", err);
    return;
  }

  // הגדרת התחנות מיד לאחר הטעינה - מאפשר חיפוש מיידי
  allStations = stations;
  
  // הצגת כל התחנות בהתחלה (ללא מיון לפי מרחק)
  statusEl.textContent = "מציג תחנות... מבקש נתוני מיקום לחישוב מרחקים";
  renderStations(stations, null);
  
  // הפעלת חיפוש מיד
  setupControls();

  // בקשת מיקום במקביל (לא חוסמת)
  requestGeolocation(stations);

  // רענון מיקום אוטומטי כל דקה
  if (CONFIG.GEOLOCATION_REFRESH_MS > 0) {
    setInterval(() => {
      if (allStations && allStations.length > 0) {
        requestGeolocation(allStations);
      }
    }, CONFIG.GEOLOCATION_REFRESH_MS);
  }
}

// פונקציה נפרדת לבקשת מיקום שרצה במקביל
function requestGeolocation(stations) {
  if (navigator.geolocation) {
    const geoOptsHigh = { enableHighAccuracy: true, timeout: CONFIG.GEOLOCATION_TIMEOUT, maximumAge: CONFIG.GEOLOCATION_MAX_AGE_HIGH };
    const geoOptsLow = { enableHighAccuracy: false, timeout: CONFIG.GEOLOCATION_TIMEOUT, maximumAge: CONFIG.GEOLOCATION_MAX_AGE_LOW };
    let triedLow = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
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
        console.warn("Geolocation failed", err);
        if (!triedLow && (err.code === 2 || err.code === 3)) {
          triedLow = true;
          navigator.geolocation.getCurrentPosition(
            (pos2) => {
              const userPos = { lat: pos2.coords.latitude, lng: pos2.coords.longitude };
              stations.forEach(
                (st) => (st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng))
              );
              stations.sort((a, b) => a.distance - b.distance);
              allStations = stations;
              userPosGlobal = userPos;
              statusEl.textContent = "";
              if (!searchInput.value.trim()) {
                renderStations(stations.slice(0, CONFIG.MAX_STATIONS_DISPLAY), userPos);
              } else {
                applyFilters();
              }
            },
            (err2) => {
              console.warn("Low accuracy geolocation failed", err2);
              statusEl.textContent = `${geoErrorText(err2.code)} – מציג רשימה מלאה`;
              // התחנות כבר מוצגות, רק נעדכן את הסטטוס
            },
            geoOptsLow
          );
        } else {
          statusEl.textContent = `${geoErrorText(err.code)} – מציג רשימה מלאה`;
          // התחנות כבר מוצגות, רק נעדכן את הסטטוס
        }
      },
      geoOptsHigh
    );
  } else {
    statusEl.textContent = "הדפדפן לא תומך במיקום – מציג רשימה ללא סינון";
    // התחנות כבר מוצגות, רק נעדכן את הסטטוס
  }
}

function applyFilters() {
  if (!allStations || allStations.length === 0) {
    stationsContainer.innerHTML = '<p>אין תחנות להצגה</p>';
    return;
  }

  let list = allStations;

  // חיפוש טקסט
  const term = searchInput.value.trim().toLowerCase();
  if (term) {
    list = list.filter((st) =>
      [st.name, st.city].some((str) => str && isTextMatch(term, str))
    );
  }

  // סינון מרחק
  const maxDist = parseFloat(distanceRange.value);
  if (isNaN(maxDist) || maxDist <= 0) {
    console.warn('Invalid distance range value:', distanceRange.value);
    return;
  }
  distanceValue.textContent = maxDist;
  if (!term && userPosGlobal) {
    list = list.filter((st) => st.distance <= maxDist);
  }

  // מיון
  const sortBy = sortSelect.value;
  if (sortBy === "price") {
    list = list.slice().sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sortBy === "distance" && userPosGlobal) {
    list = list.slice().sort((a, b) => a.distance - b.distance);
  }

  // הצגת הודעה אם אין תוצאות
  if (list.length === 0) {
    stationsContainer.innerHTML = '<p>לא נמצאו תחנות התואמות לחיפוש</p>';
    return;
  }

  renderStations(list, userPosGlobal);
}

// חיפוש ידני
let controlsSetup = false;
function setupControls() {
  if (controlsSetup) return; // מניעת הגדרה כפולה
  controlsSetup = true;
  
  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }
  if (distanceRange) {
    distanceRange.addEventListener("input", applyFilters);
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", applyFilters);
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

document.addEventListener("DOMContentLoaded", init); 