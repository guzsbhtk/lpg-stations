// רינדור ממשק משתמש

function renderStations(stations, userPos) {
  const stationsContainer = appState.getElement('stationsContainer');
  stationsContainer.innerHTML = "";
  const daySuffix = `${CONFIG.SECURITY.DAY_SUFFIX_PREFIX}${new Date().getDate() * CONFIG.SECURITY.DAY_SUFFIX_MULTIPLIER}`;
  stations.forEach((st) => {
    const div = document.createElement("div");
    div.className = "station";

    const UPDATE_FORM_BASE = CONFIG.URLS.UPDATE_FORM_BASE;

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

    // כפתור עדכון מחיר אם בטווח מוגדר
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
  const stationsContainer = appState.getElement('stationsContainer');
  const searchInput = appState.getElement('searchInput');
  const distanceRange = appState.getElement('distanceRange');
  const distanceValue = appState.getElement('distanceValue');
  const sortSelect = appState.getElement('sortSelect');
  
  const allStations = appState.getStations();
  const userPosGlobal = appState.getUserPosition();
  
  if (!allStations || allStations.length === 0) {
    appState.showNoStations();
    return;
  }

  let list = allStations;

  // חיפוש טקסט עם דירוג
  const term = searchInput.value.trim().toLowerCase();
  if (term) {
    // בדיקה זמנית לניפוי באגים
    if (term === 'קריית שמ') {
      console.log('🔍 Testing search for "קריית שמ"');
      const testStation = list.find(st => st.name && st.name.includes('קרית שמונה'));
      if (testStation) {
        console.log('Found test station:', testStation.name);
        debugTextMatch(term, testStation.name);
      }
    }
    
    // הוספת ציון דיוק לכל תחנה
    list = list.map((st) => {
      const nameScore = st.name ? getTextMatchScore(term, st.name) : 0;
      const cityScore = st.city ? getTextMatchScore(term, st.city) : 0;
      const maxScore = Math.max(nameScore, cityScore);
      
      return {
        ...st,
        searchScore: maxScore
      };
    }).filter((st) => st.searchScore > 0); // רק תחנות עם התאמה
    
    // מיון לפי ציון דיוק (גבוה יותר קודם)
    list.sort((a, b) => b.searchScore - a.searchScore);
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
  if (sortBy === "relevance" && term) {
    // מיון לפי דיוק החיפוש (כבר ממוין מהחיפוש)
    // לא צריך לעשות כלום כי כבר ממוין
  } else if (sortBy === "price") {
    list = list.slice().sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  } else if (sortBy === "distance" && userPosGlobal) {
    list = list.slice().sort((a, b) => a.distance - b.distance);
  }

  // הצגת הודעה אם אין תוצאות
  if (list.length === 0) {
    appState.showNoSearchResults();
    return;
  }

  renderStations(list, userPosGlobal);
}

// חיפוש ידני
function setupControls() {
  if (appState.isControlsSetup()) return; // מניעת הגדרה כפולה
  appState.setControlsSetup(true);
  
  const searchInput = appState.getElement('searchInput');
  const distanceRange = appState.getElement('distanceRange');
  const sortSelect = appState.getElement('sortSelect');
  
  if (searchInput) {
    // צמצום קריאות עיבוד בעת הקלדה
    searchInput.addEventListener("input", debounce(applyFilters, CONFIG.UI_DEBUG_DELAY + 50));
  }
  if (distanceRange) {
    distanceRange.addEventListener("input", debounce(applyFilters, CONFIG.UI_DEBUG_DELAY));
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", applyFilters);
  }
}
