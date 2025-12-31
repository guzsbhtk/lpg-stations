// רינדור ממשק משתמש

// בודק אם תאריך עודכן החודש הנוכחי
function isUpdatedThisMonth(dateStr) {
  if (!dateStr) return false;
  
  // הפורמט הוא MM.YY (למשל "12.25")
  const parts = dateStr.split('.');
  if (parts.length !== 2) return false;
  
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear() % 100; // רק 2 ספרות אחרונות
  
  return month === currentMonth && year === currentYear;
}

// פתיחת שכבת-על של המפה
function openMap() {
  const overlay = appState.getElement('mapOverlay');
  const mapContainer = appState.getElement('mapContainer');
  if (!overlay || !mapContainer) {
    console.error('לא נמצאו אלמנטי המפה');
    return;
  }

  // ניגודיות גבוהה משתמשת בכלל CSS גורף (.high-contrast *), שעלול להשחיר את המפה
  // לכן בזמן שהמפה פתוחה – משביתים זמנית ניגודיות גבוהה, ומשחזרים בסגירה.
  const wasHighContrast = document.body.classList.contains('high-contrast');
  if (wasHighContrast) {
    document.body.dataset.hcDisabledForMap = '1';
    document.body.classList.remove('high-contrast');
  } else {
    delete document.body.dataset.hcDisabledForMap;
  }

  // הוסף classes לגוף
  document.documentElement.classList.add('map-is-open');
  document.body.classList.add('map-is-open');

  // הצג את האוברליי
  overlay.style.display = 'block';

  // סנכרן פקדים במפה עם הפקדים הרגילים
  const distanceRange = appState.getElement('distanceRange');
  const mapDistanceRange = document.getElementById('mapDistanceRange');
  const mapDistanceValue = document.getElementById('mapDistanceValue');

  if (distanceRange && mapDistanceRange) {
    mapDistanceRange.value = distanceRange.value;
    if (mapDistanceValue) {
      mapDistanceValue.textContent = distanceRange.value;
    }
  }

  // נקה את מיכל המפה
  mapContainer.innerHTML = '';

  // השמד מפה קיימת
  const oldMap = appState.getMap();
  if (oldMap) {
    try {
      oldMap.remove();
    } catch (e) { }
    appState.setMap(null);
    appState.setMapMarkersLayer(null);
  }

  // חכה שהאוברליי יהיה גלוי ואז צור את המפה
  setTimeout(function () {
    try {
      // בדוק ש-Leaflet קיים
      if (typeof L === 'undefined') {
        console.error('Leaflet לא נטען');
        return;
      }

      // הגדר אייקונים
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
      });

      // צור את המפה
      const map = L.map(mapContainer, {
        zoomControl: true
      }).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

      // הוסף טאפים
      L.tileLayer(CONFIG.MAP.TILE_URL, {
        attribution: CONFIG.MAP.TILE_ATTRIBUTION,
        maxZoom: 18
      }).addTo(map);

      // צור שכבת סמנים
      const markersLayer = L.featureGroup().addTo(map);

      // שמור במצב
      appState.setMap(map);
      appState.setMapMarkersLayer(markersLayer);

      // צור סמן למשתמש - עיגול כחול
      const userMarker = L.marker([0, 0], {
        icon: L.divIcon({
          className: 'user-location-marker',
          html: '<div class="user-marker-dot" title="המיקום שלך"></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      });
      appState.setUserMarker(userMarker);

      console.log('✅ המפה אותחלה בהצלחה');

      // הפעל פילטרים
      setTimeout(function () {
        applyFilters();
      }, 100);

    } catch (err) {
      console.error('❌ שגיאה באתחול המפה:', err);
      mapContainer.innerHTML = '<div style="padding: 20px; text-align: center;">שגיאה בטעינת המפה</div>';
    }
  }, 100);
}

// סגירת שכבת-על של המפה
function closeMap() {
  const overlay = appState.getElement('mapOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }

  document.documentElement.classList.remove('map-is-open');
  document.body.classList.remove('map-is-open');

  // שחזור ניגודיות גבוהה אם הושבתה זמנית עבור המפה
  if (document.body.dataset.hcDisabledForMap === '1') {
    document.body.classList.add('high-contrast');
    delete document.body.dataset.hcDisabledForMap;
  }
}

// (חדש) עדכון הסמנים במפה
function updateMapMarkers(stationsToShow, userPos) {
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

      // הוסף מרחק אם יש מיקום משתמש
      const distanceText = userPos && st.distance !== undefined
        ? `<p class="distance">📏 ${st.distance.toFixed(1)} ק"מ ממיקומך</p>`
        : '';

      const isCurrentMonth = st.date && isUpdatedThisMonth(st.date);
      const hasEstimatedPrice = st.estimatedPrice && typeof st.estimatedPrice === 'number';
      const shouldShowEstimated = !isCurrentMonth && hasEstimatedPrice;
      
      let priceDisplay, dateDisplay;
      
      if (shouldShowEstimated) {
        priceDisplay = `<p class="price estimated-price">₪${escapeHTML(st.estimatedPrice)}</p>`;
        dateDisplay = `<p class="date estimated-label">💡 מחיר משוער</p>` +
          (st.date ? `<p class="date old-price-info">מחיר ישן: ₪${escapeHTML(st.price)} (${escapeHTML(st.date)})</p>` : '');
      } else {
        priceDisplay = `<p class="price">₪${escapeHTML(st.price)}</p>`;
        dateDisplay = isCurrentMonth 
          ? `<p class="date date-current-month">✅ עודכן החודש</p>`
          : st.date ? `<p class="date">🕒 עודכן: ${escapeHTML(st.date)}</p>` : '';
      }
      
      const popupContent = `
        <h3>${escapeHTML(st.name)}</h3>
        <p>${escapeHTML(st.city || '')}</p>
        ${priceDisplay}
        ${dateDisplay}
        ${distanceText}
        <a href="https://waze.com/ul?ll=${st.lat}%2C${st.lng}&navigate=yes" target="_blank" rel="noopener noreferrer">🚗 נווט עם Waze</a>
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
      userMarker.bindPopup('<strong>📍 המיקום שלך</strong>');
      // אל תפתח אוטומטית - המשתמש יכול ללחוץ אם הוא רוצה
    }

    // בדוק אם מוצגות כל התחנות
    const mapShowAll = document.getElementById('mapShowAll');
    const isShowingAll = mapShowAll && mapShowAll.checked;

    if (isShowingAll) {
      // אם מוצגות כל התחנות - התאם את הזום להציג את כולן
      if (filteredStations.length > 0 && markersLayer && markersLayer.getLayers().length > 0) {
        const bounds = markersLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.1));
        } else {
          map.setView(CONFIG.MAP.DEFAULT_CENTER, 8);
        }
      } else {
        map.setView(CONFIG.MAP.DEFAULT_CENTER, 8);
      }
    } else {
      // זום רגיל לפי מרחק
      const zoom = Math.max(8, 16 - Math.log2(maxDist * 2));
      map.setView([userPos.lat, userPos.lng], zoom);

      // הצג מעגל רדיוס
      const circle = L.circle([userPos.lat, userPos.lng], {
        radius: maxDist * 1000,
        color: '#2e7d32',
        fillColor: '#2e7d32',
        fillOpacity: 0.1,
        weight: 1
      }).addTo(map);
      appState.setRadiusCircle(circle);
    }
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
    
    // בדיקה האם המחיר מעודכן החודש הנוכחי
    const isCurrentMonth = st.date && isUpdatedThisMonth(st.date);
    const hasEstimatedPrice = st.estimatedPrice && typeof st.estimatedPrice === 'number';
    
    // אם המחיר לא מהחודש הנוכחי ויש מחיר משוער - נציג את המשוער
    const shouldShowEstimated = !isCurrentMonth && hasEstimatedPrice;
    
    if (shouldShowEstimated) {
      priceEl.textContent = `₪${st.estimatedPrice}`;
      priceEl.classList.add('estimated-price');
      
      const estimatedLabel = document.createElement("span");
      estimatedLabel.className = "date estimated-label";
      estimatedLabel.innerHTML = '  <span class="tooltip-trigger">מחיר משוער</span>';
      priceEl.appendChild(estimatedLabel);
      
      // הוסף div נסתר עם המחיר הישן
      const oldPriceDiv = document.createElement("div");
      oldPriceDiv.className = "old-price-tooltip";
      oldPriceDiv.innerHTML = `מחיר ישן: ₪${st.price}` + (st.date ? `<br>עודכן: ${st.date}` : '');
      priceEl.appendChild(oldPriceDiv);
    } else {
      priceEl.textContent = `₪${st.price}`;
    }

    if (st.date && !shouldShowEstimated) {
      const dateSpan = document.createElement("span");
      dateSpan.className = isCurrentMonth ? "date date-current-month" : "date";
      dateSpan.textContent = isCurrentMonth ? `  עודכן החודש` : `  עודכן: ${st.date}`;
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

    if (st.distance !== undefined && st.distance <= CONFIG.UPDATE_DISTANCE_THRESHOLD) {
      const isCurrentMonth = st.date && isUpdatedThisMonth(st.date);
      const hasEstimatedPrice = st.estimatedPrice && typeof st.estimatedPrice === 'number';
      const shouldShowEstimated = !isCurrentMonth && hasEstimatedPrice;
      
      // כפתור "עדכן מחיר" רגיל
      const updateLink = document.createElement("a");
      updateLink.className = "update";
      updateLink.href = UPDATE_FORM_BASE + st.rowCode + daySuffix;
      updateLink.target = "_blank";
      updateLink.rel = "noopener noreferrer";
      updateLink.textContent = "עדכן מחיר";
      actions.appendChild(updateLink);
      
      // כפתור "אשר מחיר" אם יש מחיר משוער
      if (shouldShowEstimated && CONFIG.FORM_ENTRIES && CONFIG.FORM_ENTRIES.PRICE) {
        const confirmLink = document.createElement("a");
        confirmLink.className = "confirm-price";
        // מוסיף את המחיר המשוער כפרמטר נוסף ב-URL
        confirmLink.href = UPDATE_FORM_BASE + st.rowCode + daySuffix + `&entry.${CONFIG.FORM_ENTRIES.PRICE}=${st.estimatedPrice}`;
        confirmLink.target = "_blank";
        confirmLink.rel = "noopener noreferrer";
        confirmLink.textContent = "אשר מחיר";
        confirmLink.title = `אשר מחיר משוער: ₪${st.estimatedPrice}`;
        actions.appendChild(confirmLink);
      }
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

  // בדוק אם להציג את כל התחנות (מהמפה)
  const mapShowAll = document.getElementById('mapShowAll');
  const isShowingAll = mapShowAll && mapShowAll.checked;

  if (!term && userPosGlobal && !isShowingAll) {
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

  // עדכן את המפה רק אם היא מאותחלת וגלויה
  const map = appState.getMap();
  const overlay = appState.getElement('mapOverlay');
  if (map && overlay && overlay.style.display === 'block') {
    updateMapMarkers(list, userPosGlobal);
    updateMapView(list, userPosGlobal, term, maxDist);
    console.log(`🗺️ מוצגות ${list.length} תחנות במפה`);
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

  // פקדים בתוך המפה
  const mapDistanceRange = document.getElementById('mapDistanceRange');
  const mapDistanceValue = document.getElementById('mapDistanceValue');
  const mapShowAll = document.getElementById('mapShowAll');

  if (searchInput) {
    searchInput.addEventListener("input", debounce(applyFilters, CONFIG.UI_DEBUG_DELAY + 50));
  }

  // סנכרון סליידר המרחק במפה
  if (mapDistanceRange && distanceRange) {
    mapDistanceRange.addEventListener("input", function () {
      const value = mapDistanceRange.value;
      if (mapDistanceValue) {
        mapDistanceValue.textContent = value;
      }
      // סנכרן עם הסליידר הרגיל
      distanceRange.value = value;
      const distanceValue = appState.getElement('distanceValue');
      if (distanceValue) {
        distanceValue.textContent = value;
      }
      // עדכן את המפה
      applyFilters();
    });

    // סנכרון הפוך - כשמשנים את הסליידר הרגיל
    distanceRange.addEventListener("input", function () {
      mapDistanceRange.value = distanceRange.value;
      if (mapDistanceValue) {
        mapDistanceValue.textContent = distanceRange.value;
      }
    });
  }

  // checkbox "הצג הכל" במפה
  if (mapShowAll) {
    mapShowAll.addEventListener("change", function () {
      if (mapShowAll.checked) {
        // השבת את הסליידר
        if (mapDistanceRange) {
          mapDistanceRange.disabled = true;
        }
        console.log('🗺️ מציג את כל התחנות בארץ');
      } else {
        // הפעל את הסליידר
        if (mapDistanceRange) {
          mapDistanceRange.disabled = false;
        }
        console.log('🗺️ חוזר לסינון לפי מרחק');
      }
      // עדכן את המפה
      applyFilters();
    });
  }

  if (distanceRange) {
    const clearSearchOnInteraction = function (e) {
      if (searchInput && searchInput.value.trim()) {
        e.preventDefault();
        searchInput.value = '';
        applyFilters();
      }
    };

    distanceRange.addEventListener("touchstart", clearSearchOnInteraction);
    distanceRange.addEventListener("mousedown", clearSearchOnInteraction);

    distanceRange.addEventListener("click", function (e) {
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
      distanceLabel.addEventListener("click", function (e) {
        if (searchInput && searchInput.value.trim()) {
          e.preventDefault();
          searchInput.value = '';
          applyFilters();
        }
      });
    }

    distanceRange.addEventListener("keydown", function (e) {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        searchInput && searchInput.value.trim()) {
        e.preventDefault();
        searchInput.value = '';
        applyFilters();
      }
    });

    distanceRange.addEventListener("input", function (e) {
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
  
  // הוסף מאזין לאירועי מחירים משוערים
  setupEstimatedPriceTooltips();
}

// פונקציה להוספת tooltip למחירים משוערים
function setupEstimatedPriceTooltips() {
  // נשתמש ב-event delegation כי התחנות נוצרות דינמית
  const stationsContainer = appState.getElement('stationsContainer');
  if (!stationsContainer) return;
  
  // הסר מאזינים קודמים (אם יש)
  stationsContainer.removeEventListener('click', handleEstimatedPriceClick);
  stationsContainer.removeEventListener('mouseenter', handleEstimatedPriceHover, true);
  stationsContainer.removeEventListener('mouseleave', handleEstimatedPriceLeave, true);
  
  // הוסף מאזינים חדשים
  stationsContainer.addEventListener('click', handleEstimatedPriceClick);
  stationsContainer.addEventListener('mouseenter', handleEstimatedPriceHover, true);
  stationsContainer.addEventListener('mouseleave', handleEstimatedPriceLeave, true);
}

// טיפול בלחיצה על מחיר משוער
function handleEstimatedPriceClick(e) {
  const priceEl = e.target.closest('.estimated-price');
  if (!priceEl) return;
  
  priceEl.classList.toggle('show-old-price');
}

// טיפול במעבר עכבר על מחיר משוער
function handleEstimatedPriceHover(e) {
  const priceEl = e.target.closest('.estimated-price');
  if (!priceEl) return;
  
  priceEl.classList.add('show-old-price');
}

// טיפול ביציאת עכבר ממחיר משוער
function handleEstimatedPriceLeave(e) {
  const priceEl = e.target.closest('.estimated-price');
  if (!priceEl) return;
  
  // אל תסיר אם נלחץ (toggle נשאר)
  if (!priceEl.classList.contains('clicked')) {
    priceEl.classList.remove('show-old-price');
  }
}

// הוספת userMarker ל-AppState
AppState.prototype.setUserMarker = function (marker) { this.userMarker = marker; };
AppState.prototype.getUserMarker = function () { return this.userMarker; };