// URL של הגיליון (GViz API)
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1FDx3CdFpCLxQAKFRqQ1DpiF8l6k46L6M6hWoahuGB30/gviz/tq?tqx=out:json";

const statusEl = document.getElementById("status");
const stationsContainer = document.getElementById("stations");
const searchInput = document.getElementById("search");
const distanceRange = document.getElementById("distanceRange");
const distanceValue = document.getElementById("distanceValue");
const sortSelect = document.getElementById("sortBy");

let allStations = [];
let userPosGlobal = null;

// פונקציה להבאת הנתונים מהגיליון
async function fetchSheetData() {
  try {
    const res = await fetch(SHEET_URL);
    const text = await res.text();
    // תגובת GViz עטופה בקוד JS – צריך לחלץ את ה-JSON
    const jsonStr = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const data = JSON.parse(jsonStr);
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
      return { name, city, price, date, lat, lng, rowNumber, rowCode };
    })
    .filter(Boolean);
}

// חישוב מרחק לפי נוסחת האברסין
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // רדיוס כדור הארץ בק"מ
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

    // חשב מרחק במידת הצורך
    if (userPos && (st.distance === undefined || isNaN(st.distance))) {
      st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng);
    }

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
      const dist = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng);
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
    if (st.distance !== undefined && st.distance <= 1) {
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
  } catch (err) {
    statusEl.textContent = "אירעה שגיאה בטעינת הנתונים";
    return;
  }

  statusEl.textContent = "מבקש נתוני מיקום מהדפדפן…";
  if (navigator.geolocation) {
    const geoOptsHigh = { enableHighAccuracy: true, timeout: 60000, maximumAge: 30000 };
    const geoOptsLow = { enableHighAccuracy: false, timeout: 60000, maximumAge: 600000 };
    let triedLow = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        stations.forEach(
          (st) => (st.distance = distanceKm(userPos.lat, userPos.lng, st.lat, st.lng))
        );
        stations.sort((a, b) => a.distance - b.distance);
        allStations = stations;
        userPosGlobal = userPos;
        statusEl.textContent = "";
        renderStations(stations.slice(0, 10), userPos);
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
              renderStations(stations.slice(0, 10), userPos);
            },
            (err2) => {
              console.warn("Low accuracy geolocation failed", err2);
              statusEl.textContent = `${geoErrorText(err2.code)} – מציג רשימה מלאה`;
              allStations = stations;
              renderStations(stations);
            },
            geoOptsLow
          );
        } else {
          statusEl.textContent = `${geoErrorText(err.code)} – מציג רשימה מלאה`;
          allStations = stations;
          renderStations(stations);
        }
      },
      geoOptsHigh
    );
  } else {
    statusEl.textContent = "הדפדפן לא תומך במיקום – מציג רשימה ללא סינון";
    renderStations(stations);
    allStations = stations;
  }
}

function applyFilters() {
  let list = allStations;

  // חיפוש טקסט
  const term = searchInput.value.trim().toLowerCase();
  if (term) {
    list = list.filter((st) =>
      [st.name, st.city].some((str) => str.toLowerCase().includes(term))
    );
  }

  // סינון מרחק
  const maxDist = parseFloat(distanceRange.value);
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

  renderStations(list, userPosGlobal);
}

// חיפוש ידני
function setupControls() {
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
document.addEventListener("DOMContentLoaded", setupControls); 