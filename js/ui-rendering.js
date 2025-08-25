// רינדור ממשק משתמש
const statusEl = document.getElementById("status");
const stationsContainer = document.getElementById("stations");
const searchInput = document.getElementById("search");
const distanceRange = document.getElementById("distanceRange");
const distanceValue = document.getElementById("distanceValue");
const sortSelect = document.getElementById("sortBy");

let allStations = [];
let userPosGlobal = null;

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
    wazeLink.innerHTML = '<img src="icons/waze.svg" class="icon" alt="לוגו Waze - ניווט עם Waze"> Waze';

    const mapsLink = document.createElement("a");
    mapsLink.className = "maps";
    mapsLink.href = `https://www.google.com/maps/dir/?api=1&destination=${st.lat}%2C${st.lng}`;
    mapsLink.target = "_blank";
    mapsLink.rel = "noopener noreferrer";
    mapsLink.innerHTML = '<img src="icons/maps.svg" class="icon" alt="לוגו Google Maps - ניווט עם Google Maps"> Google Maps';

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

function applyFilters() {
  if (!allStations || allStations.length === 0) {
    stationsContainer.innerHTML = '<div class="error-message" role="alert">אין תחנות להצגה</div>';
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
    stationsContainer.innerHTML = '<div class="error-message" role="alert">לא נמצאו תחנות התואמות לחיפוש</div>';
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
