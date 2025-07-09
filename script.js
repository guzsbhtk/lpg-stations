// URL של הגיליון (GViz API)
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1FDx3CdFpCLxQAKFRqQ1DpiF8l6k46L6M6hWoahuGB30/gviz/tq?tqx=out:json";

const statusEl = document.getElementById("status");
const stationsContainer = document.getElementById("stations");
const searchInput = document.getElementById("search");

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

  return table.rows
    .map((row) => {
      const cells = row.c;
      const name = cells[idxName]?.v;
      const price = cells[idxPrice]?.v;
      const city = idxCity !== -1 ? cells[idxCity]?.v : "";
      const coordsStr = cells[idxCoords]?.v;
      if (!name || !price || !coordsStr) return null;
      const [lat, lng] = coordsStr.split(/,\s*/).map(Number);
      if (isNaN(lat) || isNaN(lng)) return null;
      return { name, city, price, lat, lng };
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
  stations.forEach((st) => {
    const div = document.createElement("div");
    div.className = "station";

    const title = document.createElement("h2");
    title.textContent = st.city ? `${st.name} ${st.city}` : st.name;
    div.appendChild(title);

    const priceEl = document.createElement("p");
    priceEl.className = "price";
    priceEl.textContent = `₪${st.price}`;
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
    wazeLink.textContent = "Waze";

    const mapsLink = document.createElement("a");
    mapsLink.className = "maps";
    mapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${st.lat}%2C${st.lng}`;
    mapsLink.target = "_blank";
    mapsLink.rel = "noopener noreferrer";
    mapsLink.textContent = "Google Maps";

    actions.appendChild(wazeLink);
    actions.appendChild(mapsLink);
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
        statusEl.textContent = "לא התקבל מיקום – מציג רשימה ללא סינון";
        allStations = stations;
        renderStations(stations);
      }
    );
  } else {
    statusEl.textContent = "הדפדפן לא תומך במיקום – מציג רשימה ללא סינון";
    renderStations(stations);
    allStations = stations;
  }
}

// חיפוש ידני
function setupSearch() {
  if (!searchInput) return;
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      renderStations(allStations.slice(0, 10), userPosGlobal);
      return;
    }
    const filtered = allStations.filter((st) =>
      [st.name, st.city].some((str) => str.toLowerCase().includes(term))
    );
    renderStations(filtered, userPosGlobal);
  });
}

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("DOMContentLoaded", setupSearch); 