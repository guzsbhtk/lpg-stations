// עיבוד נתונים וחיפוש

// פונקציה בטוחה לפיענוח תגובת GViz
function parseGVizResponse(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('תגובה ריקה או לא תקינה מהשרת');
    }
    
    const start = text.indexOf('{"');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) {
      throw new Error('פורמט תגובה לא תקין מהשרת');
    }
    const jsonStr = text.substring(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    
    // בדיקה שהתגובה מכילה את הנתונים הנדרשים
    if (!parsed.table || !parsed.table.cols || !parsed.table.rows) {
      throw new Error('נתונים חסרים בתגובת השרת');
    }
    
    return parsed;
  } catch (err) {
    console.error('Failed to parse GViz response:', err);
    if (err.name === 'SyntaxError') {
      throw new Error('שגיאה בפיענוח הנתונים מהשרת');
    }
    throw new Error(err.message || 'לא ניתן לפענח את תגובת השרת');
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

// חיפוש מתקדם עם דמיון טקסט - מחזיר ציון דיוק
function getTextMatchScore(searchTerm, targetText) {
  const normalizedSearch = normalizeHebrewText(searchTerm);
  const normalizedTarget = normalizeHebrewText(targetText);
  
  // חיפוש מדויק - מכיל את המחרוזת בדיוק
  if (normalizedTarget.includes(normalizedSearch)) {
    // אם זה מתחיל בדיוק עם החיפוש - ציון גבוה יותר
    if (normalizedTarget.startsWith(normalizedSearch)) {
      return 100; // ציון מקסימלי
    }
    return 90; // ציון גבוה
  }
  
  // חיפוש בתחילת מילים - לדוגמה "קרית ש" ימצא "קריית שמונה"
  const targetWords = normalizedTarget.split(' ');
  const searchWords = normalizedSearch.split(' ');
  
  // בדיקה אם כל מילות החיפוש מופיעות בתחילת מילים ברצף (בכל מקום בטקסט)
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
      return 80; // ציון גבוה לחיפוש בתחילת מילים
    }
  }
  
  // חיפוש חלקי - בדיקה אם מילות החיפוש מופיעות בכל מקום בטקסט
  const searchWordsFound = searchWords.every(searchWord => 
    targetWords.some(targetWord => targetWord.startsWith(searchWord))
  );
  if (searchWordsFound) {
    return 70; // ציון בינוני לחיפוש חלקי
  }
  
  // חיפוש עם סובלנות לשגיאות (Levenshtein distance)
  if (normalizedSearch.length >= CONFIG.SEARCH.MIN_LENGTH_FOR_FUZZY) {
    const fullDistance = levenshteinDistance(normalizedSearch, normalizedTarget);
    const wordDistances = normalizedTarget.split(' ').map(word => 
      levenshteinDistance(normalizedSearch, word)
    );
    const minWordDistance = Math.min(...wordDistances);
    
    // אם יש התאמה עם סובלנות לשגיאות
    if (fullDistance <= CONFIG.SEARCH.MAX_LEVENSHTEIN_DISTANCE || 
        minWordDistance <= CONFIG.SEARCH.MAX_LEVENSHTEIN_DISTANCE) {
      
      // חישוב ציון על בסיס המרחק - ככל שהמרחק קטן יותר, הציון גבוה יותר
      const bestDistance = Math.min(fullDistance, minWordDistance);
      const maxDistance = CONFIG.SEARCH.MAX_LEVENSHTEIN_DISTANCE;
      const score = Math.max(0, 70 - (bestDistance * 20)); // ציון בין 50-70
      return score;
    }
  }
  
  return 0; // אין התאמה
}

// פונקציה קיימת לתאימות לאחור
function isTextMatch(searchTerm, targetText) {
  return getTextMatchScore(searchTerm, targetText) > 0;
}

// פונקציה לבדיקת חיפוש (לניפוי באגים)
function debugTextMatch(searchTerm, targetText) {
  const normalizedSearch = normalizeHebrewText(searchTerm);
  const normalizedTarget = normalizeHebrewText(targetText);
  
  console.log('🔍 Debug Text Match:');
  console.log('Search term:', searchTerm);
  console.log('Target text:', targetText);
  console.log('Normalized search:', normalizedSearch);
  console.log('Normalized target:', normalizedTarget);
  
  const score = getTextMatchScore(searchTerm, targetText);
  console.log('Match score:', score);
  
  return score;
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
    // בדיקה אם יש חיבור לאינטרנט
    if (!navigator.onLine) {
      throw new Error('אין חיבור לאינטרנט - נדרש חיבור לטעינת נתונים');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);
    
    const res = await fetch(CONFIG.URLS.SHEET, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`שגיאת שרת: ${res.status} - ${res.statusText}`);
    }
    
    const text = await res.text();
    const data = parseGVizResponse(text);
    return data;
  } catch (err) {
    console.error("שגיאה בשליפת נתונים", err);
    
    // טיפול מיוחד בשגיאות רשת
    if (err.name === 'AbortError') {
      throw new Error('הבקשה חרגה ממגבלת הזמן - נסה שוב');
    } else if (err.message.includes('Failed to fetch')) {
      throw new Error('בעיית חיבור לאינטרנט - בדוק את החיבור ונסה שוב');
    }
    
    throw err;
  }
}

// פענוח הנתונים לג'ייסון של תחנות
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
