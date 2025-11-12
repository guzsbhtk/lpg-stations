// ניהול מצב האפליקציה
class AppState {
  constructor() {
    this.stations = [];
    this.userPosition = null;
    this.controlsSetup = false;
    this.isLoading = false;
    this.elements = {};
    
    // (חדש) מצב המפה
    this.map = null;
    this.mapMarkersLayer = null;
    this.radiusCircle = null; // (חדש) לשמור את עיגול הרדיוס
    
    this.initElements();
  }
  
  initElements() {
    this.elements = {
      status: document.querySelector(CONFIG.SELECTORS.STATUS),
      stationsContainer: document.querySelector(CONFIG.SELECTORS.STATIONS_CONTAINER),
      searchInput: document.querySelector(CONFIG.SELECTORS.SEARCH_INPUT),
      distanceRange: document.querySelector(CONFIG.SELECTORS.DISTANCE_RANGE),
      distanceValue: document.querySelector(CONFIG.SELECTORS.DISTANCE_VALUE),
      sortSelect: document.querySelector(CONFIG.SELECTORS.SORT_SELECT),
      
      // (חדש) אלמנטים של המפה
      mapOverlay: document.querySelector(CONFIG.SELECTORS.MAP_OVERLAY),
      mapContainer: document.querySelector(CONFIG.SELECTORS.MAP_CONTAINER),
      openMapButton: document.querySelector(CONFIG.SELECTORS.OPEN_MAP_BUTTON),
      closeMapButton: document.querySelector(CONFIG.SELECTORS.CLOSE_MAP_BUTTON)
    };
  }
  
  setStations(stations) {
    this.stations = stations;
  }
  
  getStations() {
    return this.stations;
  }
  
  setUserPosition(position) {
    this.userPosition = position;
  }
  
  getUserPosition() {
    return this.userPosition;
  }
  
  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (this.elements.status) {
      if (isLoading) {
        this.elements.status.innerHTML = CONFIG.MESSAGES.LOADING;
      } else {
        this.elements.status.textContent = "";
      }
    }
  }
  
  isControlsSetup() {
    return this.controlsSetup;
  }
  
  setControlsSetup(setup) {
    this.controlsSetup = setup;
  }
  
  getElement(name) {
    return this.elements[name];
  }
  
  // (חדש) Getters/Setters של המפה
  setMap(mapInstance) { this.map = mapInstance; }
  getMap() { return this.map; }
  setMapMarkersLayer(layer) { this.mapMarkersLayer = layer; }
  getMapMarkersLayer() { return this.mapMarkersLayer; }
  setRadiusCircle(circle) { this.radiusCircle = circle; }
  getRadiusCircle() { return this.radiusCircle; }
  
  showError(message) {
    if (this.elements.status) {
      this.elements.status.innerHTML = createErrorMessage(message);
    }
  }
  
  showNoStations() {
    if (this.elements.stationsContainer) {
      updateContainer(this.elements.stationsContainer, CONFIG.MESSAGES.NO_STATIONS);
    }
  }
  
  showNoSearchResults() {
    if (this.elements.stationsContainer) {
      updateContainer(this.elements.stationsContainer, CONFIG.MESSAGES.NO_SEARCH_RESULTS);
    }
  }
}

// פונקציות עזר
function createErrorMessage(message) {
  return `<div class="error-message" role="alert">${message}</div>`;
}

function updateContainer(container, message) {
  container.innerHTML = createErrorMessage(message);
}

// יצירת instance יחיד
const appState = new AppState();