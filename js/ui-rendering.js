// רינדור ממשק משתמש

// (חדש) אתחול המפה - ייקרא רק פעם אחת
function initMap() {
  const mapContainer = appState.getElement('mapContainer');
  if (!mapContainer || appState.getMap()) { // בדוק אם המפה כבר מאותחלת
    return;
  }
  
  console.log('🗺️ Initializing Map for the first time (on a visible container)...');
  
  if (typeof L === 'undefined') {
    console.error("Leaflet library (L) is not defined.");
    return;
  }

  try {
    // (תיקון CORB) הגדרה מחדש של נתיבי האייקונים ל-CDN תקין
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    const map = L.map(mapContainer, {
      zoomControl: true 
    }).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

    L.tileLayer(CONFIG.MAP.TILE_URL, {
      attribution: CONFIG.MAP.TILE_ATTRIBUTION,
      maxZoom: 18,
    }).addTo(map);

    const markersLayer = L.featureGroup().addTo(map);

    appState.setMap(map);
    appState.setMapMarkersLayer(markersLayer);
    
    const userMarker = L.marker([0, 0], {
      icon: L.icon({
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png', // שימוש באייקון תקין
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        shadowSize: [41, 41],
        className: 'user-location-marker' 
      })
    });
    appState.setUserMarker(userMarker); 
  } catch (err) {
    console.error("Failed to initialize map:", err);
    mapContainer.innerHTML = '<div class="error-message">שגיאה בטעינת המפה</div>';
  }
}

// (חדש) פתיחת שכבת-על של המפה
function openMap() {
  const overlay = appState.getElement('mapOverlay');
  if (!overlay) return;

  // 1. הפוך את המיכל לגלוי (מציג דף לבן)
  overlay.style.display = 'block';
  
  // 2. תן לדפדפן רגע לצייר את זה
  setTimeout(function() {
    
    // 3. (תיקון קריטי) אתחל את המפה רק אם צריך, ועכשיו כשהיא גלויה
    if (!appState.getMap()) {
      initMap();
    }
    
    const map = appState.getMap();
    if (!map) return; // אתחול נכשל

    // 4. ודא שהמפה יודעת מה גודלה (זה פותר את הקוביות)
    map.invalidateSize();
        
    // 5. עכשיו הפעל את הפילטרים כדי לצייר סמנים ומיקום
    applyFilters(); 
    
  }, 50); // 50ms הוא דיליי בטוח
}

// (חדש) סגירת שכבת-על של המפה
function closeMap() {
  const overlay = appState.getElement('mapOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

// (חדש) עדכון הסמנים במפה
function updateMapMarkers(stationsToShow) {
  const map = appState.getMap();
  const markersLayer = appState.getMapMarkersLayer();
  if (!map || !markersLayer) return;

  markersLayer.clearLayers();
  
  if (!stationsToShow || stationsToShow.length === 0) {
    return; 
  }

  stationsToShow.forEach(st => {
    try {
      const marker = L.marker([st.lat, st.lng]);
      
      const popupContent = `
        <h3>${st.name}</h3>
        <p>${st.city || ''}</p>
        <p class="price">₪${st.price}</p>
        ${st.date ? `<p class="date">עודכן: ${st.date}</p>` : ''}
        <a href="https://waze.com/ul?ll=${st.lat}%2C${st.lng}&navigate=yes" target="_blank" rel="noopener noreferrer">נווט עם Waze</a>
      `;
      
      marker.bindPopup(popupContent);
      marker.addTo(markersLayer);
    } catch (err) {
      console.warn("Failed to create marker for station:", st, err);
    }
  });
}

// (חדש) עדכון תצוגת המפה (זום ומרכז) בהתאם לפילטרים
function updateMapView(filteredStations, userPos, searchTerm, maxDist) {
  const map = appState.getMap();
  const markersLayer = appState.getMapMarkersLayer();
  if (!map) return;

  const oldCircle = appState.getRadiusCircle();
  if (oldCircle) {
    map.removeLayer(oldCircle);
    appState.setRadiusCircle(null);
  }
  
  const userMarker = appState.getUserMarker();
  if (userMarker) {
    map.removeLayer(userMarker);
  }

  // מקרה 1: יש חיפוש פעיל
  if (searchTerm) {
    if (filteredStations.length > 0) {
      const bounds = markersLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1)); 
      }
    } else {
      map.setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM); 
    }
  }
  // מקרה 2: אין חיפוש, יש מיקום משתמש
  else if (userPos) {
    if (userMarker) {
      userMarker.setLatLng([userPos.lat, userPos.lng]).addTo(map);
    }
    
    const zoom = Math.max(8, 16 - Math.log2(maxDist * 2));
    map.setView([userPos.lat, userPos.lng], zoom);

    const circle = L.circle([userPos.lat, userPos.lng], {
      radius: maxDist * 1000, 
      color: '#2e7d32',
      fillColor: '#2e7d32',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(map);
    appState.setRadiusCircle(circle);
  }
  // מקרה 3: אין חיפוש, אין מיקום
  else {
    map.setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
  }
}


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
  const term = searchInput.value.trim().toLowerCase();
  
  updateDistanceControlsState(term, distanceRange, distanceValue);
  
  if (term) {
    list = list.map((st) => {
      const nameScore = st.name ? getTextMatchScore(term, st.name) : 0;
      const cityScore = st.city ? getTextMatchScore(term, st.city) : 0;
      const maxScore = Math.max(nameScore, cityScore);
      return { ...st, searchScore: maxScore };
    }).filter((st) => st.searchScore > 0);
    list.sort((a, b) => b.searchScore - a.searchScore);
  }

  const maxDist = parseFloat(distanceRange.value);
  if (isNaN(maxDist) || maxDist <= 0) {
    console.warn('Invalid distance range value:', distanceRange.value);
    return;
  }
  distanceValue.textContent = maxDist;
  
  if (!term && userPosGlobal) {
    list = list.filter((st) => st.distance <= maxDist);
  }

  const sortBy = sortSelect.value;
  
  if (term) {
    if (sortBy === "price") {
      list = list.slice().sort((a, b) => {
        if (a.searchScore !== b.searchScore) return b.searchScore - a.searchScore;
        return parseFloat(a.price) - parseFloat(b.price);
      });
    } else if (sortBy === "distance" && userPosGlobal) {
      list = list.slice().sort((a, b) => {
        if (a.searchScore !== b.searchScore) return b.searchScore - a.searchScore;
        return a.distance - b.distance;
      });
    }
  } else {
    if (sortBy === "price") {
      list = list.slice().sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortBy === "distance" && userPosGlobal) {
      list = list.slice().sort((a, b) => a.distance - b.distance);
    }
  }

  // עדכן את הרשימה (תמיד)
  if (list.length === 0) {
    appState.showNoSearchResults();
  } else {
    renderStations(list, userPosGlobal);
  }

  // (תיקון) עדכן את המפה רק אם היא מאותחלת וגלויה
  const map = appState.getMap();
  const overlay = appState.getElement('mapOverlay');
  if (map && overlay && overlay.style.display === 'block') {
    updateMapMarkers(list);
    updateMapView(list, userPosGlobal, term, maxDist);
  }
}


function updateDistanceControlsState(term, distanceRange, distanceValue) {
  const distanceLabel = distanceRange?.parentElement?.querySelector('label');
  const searchNotice = document.getElementById('search-notice');
  
  if (term) {
    if (distanceRange) {
      distanceRange.setAttribute('data-search-active', 'true');
      distanceRange.style.opacity = '0.5';
      distanceRange.style.cursor = 'pointer'; 
      distanceRange.style.pointerEvents = 'auto';
    }
    if (distanceLabel) {
      distanceLabel.style.opacity = '0.5';
      distanceLabel.style.cursor = 'pointer';
    }
    if (distanceValue) {
      distanceValue.style.opacity = '0.5';
    }
    
    if (searchNotice) {
      searchNotice.style.display = 'block';
      searchNotice.textContent = '🔍 מחפש תחנות בכל הארץ';
    }
  } else {
    if (distanceRange) {
      distanceRange.removeAttribute('data-search-active');
      distanceRange.style.opacity = '1';
      distanceRange.style.cursor = 'pointer';
      distanceRange.style.pointerEvents = 'auto';
    }
    if (distanceLabel) {
      distanceLabel.style.opacity = '1';
      distanceLabel.style.cursor = 'default';
    }
    if (distanceValue) {
      distanceValue.style.opacity = '1';
    }
    
    if (searchNotice) {
      searchNotice.style.display = 'none';
    }
  }
}

// חיפוש ידני
function setupControls() {
  if (appState.isControlsSetup()) return; 
  appState.setControlsSetup(true);
  
  const searchInput = appState.getElement('searchInput');
  const distanceRange = appState.getElement('distanceRange');
  const sortSelect = appState.getElement('sortSelect');
  
  const openMapButton = appState.getElement('openMapButton');
  const closeMapButton = appState.getElement('closeMapButton');
  
  if (searchInput) {
    searchInput.addEventListener("input", debounce(applyFilters, CONFIG.UI_DEBUG_DELAY + 50));
  }
  
  if (distanceRange) {
    const clearSearchOnInteraction = function(e) {
      if (searchInput && searchInput.value.trim()) {
        e.preventDefault(); 
        searchInput.value = '';
        applyFilters();
      }
    };
    
    distanceRange.addEventListener("touchstart", clearSearchOnInteraction);
    distanceRange.addEventListener("mousedown", clearSearchOnInteraction);
    
    distanceRange.addEventListener("click", function(e) {
      if (distanceRange.getAttribute('data-search-active') === 'true') {
        e.preventDefault(); 
        if (searchInput && searchInput.value.trim()) {
          searchInput.value = '';
          applyFilters();
        }
      }
    });
    
    const distanceLabel = distanceRange.parentElement?.querySelector('label');
    if (distanceLabel) {
      distanceLabel.addEventListener("click", function(e) {
        if (searchInput && searchInput.value.trim()) {
          e.preventDefault();
          searchInput.value = '';
          applyFilters();
        }
      });
    }
    
    distanceRange.addEventListener("keydown", function(e) {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && 
          searchInput && searchInput.value.trim()) {
        e.preventDefault(); 
        searchInput.value = '';
        applyFilters();
      }
    });
    
    distanceRange.addEventListener("input", function(e) {
      if (distanceRange.getAttribute('data-search-active') === 'true') {
        e.preventDefault();
        return;
      }
      debounce(applyFilters, CONFIG.UI_DEBUG_DELAY)();
    });
  }
  
  if (sortSelect) {
    sortSelect.addEventListener("change", applyFilters);
  }
  
  if (openMapButton) {
    openMapButton.addEventListener('click', openMap);
  }
  if (closeMapButton) {
    closeMapButton.addEventListener('click', closeMap);
  }
}

// הוספת userMarker ל-AppState
AppState.prototype.setUserMarker = function(marker) { this.userMarker = marker; };
AppState.prototype.getUserMarker = function() { return this.userMarker; };