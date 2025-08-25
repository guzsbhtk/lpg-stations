
/**
 * 
 * @param {number} rowNumber - מספר השורה בגיליון (כולל כותרת)
 * @returns {string} קוד אבטחה
 */
function generateRowCode(rowNumber) {
  const rowSquared = rowNumber * rowNumber;
  return `${rowNumber}${rowSquared}`;
}

/**
 * 
 * @returns {string} סיומת יום
 */
function generateDaySuffix() {
  const today = new Date().getDate();
  const multiplied = today * CONFIG.SECURITY.DAY_SUFFIX_MULTIPLIER;
  return `${CONFIG.SECURITY.DAY_SUFFIX_PREFIX}${multiplied}`;
}

/**
 * יוצר URL מלא לעדכון מחיר תחנה
 * Creates complete URL for station price update
 * 
 * @param {Object} station - אובייקט תחנה עם rowCode
 * @returns {string} URL מלא לטופס עדכון
 */
function generateUpdateURL(station) {
  const baseURL = CONFIG.URLS.UPDATE_FORM_BASE;
  const securityCode = station.rowCode;
  const daySuffix = generateDaySuffix();
  
  return `${baseURL}${securityCode}${daySuffix}`;
}

/**
 * בודק אם המשתמש נמצא בטווח המתאים לעדכון מחיר
 * Checks if user is within appropriate range for price update
 * 
 * @param {number} distance - מרחק בקילומטרים
 * @returns {boolean} האם המשתמש יכול לעדכן מחיר
 */
function canUpdatePrice(distance) {
  return distance !== undefined && distance <= CONFIG.UPDATE_DISTANCE_THRESHOLD;
}

/**
 * מסביר את מנגנון האבטחה (לצורכי debug בלבד)
 * Explains security mechanism (for debug purposes only)
 * 
 * @param {number} rowNumber - מספר השורה
 * @returns {Object} הסבר על הקודים
 */
function explainSecurity(rowNumber) {
  const rowCode = generateRowCode(rowNumber);
  const daySuffix = generateDaySuffix();
  
  return {
    rowNumber,
    rowSquared: rowNumber * rowNumber,
    rowCode,
    today: new Date().getDate(),
    dayMultiplied: new Date().getDate() * CONFIG.SECURITY.DAY_SUFFIX_MULTIPLIER,
    daySuffix,
    explanation: `שורה ${rowNumber} מקבלת קוד ${rowCode} (${rowNumber} + ${rowNumber * rowNumber}), יום ${new Date().getDate()} מקבל סיומת ${daySuffix}`
  };
}
