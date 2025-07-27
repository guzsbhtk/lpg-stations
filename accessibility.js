// תוסף נגישות מתקדם
document.addEventListener('DOMContentLoaded', function() {
  // יצירת תפריט נגישות
  var menu = document.createElement('div');
  menu.id = 'accessibility-menu';
  menu.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 20px;
    background: white;
    border: 2px solid #2e7d32;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
    z-index: 1000;
    display: none;
    min-width: 250px;
    direction: rtl;
  `;
  
  menu.innerHTML = `
    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #2e7d32; text-align: center;">הגדרות נגישות</h3>
    <button onclick="increaseText()" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 8px; font-size: 14px;">הגדלת טקסט</button>
    <button onclick="decreaseText()" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 8px; font-size: 14px;">הקטנת טקסט</button>
    <button id="contrast-btn" onclick="toggleHighContrast()" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 8px; font-size: 14px;">ניגודיות גבוהה</button>
    <button id="spacing-btn" onclick="toggleSpacing()" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer; border-radius: 8px; font-size: 14px;">הגדלת רווחים</button>
    <button onclick="resetAccessibility()" style="display: block; width: 100%; margin: 8px 0; padding: 12px; border: 1px solid #f44336; background: #f44336; color: white; cursor: pointer; border-radius: 8px; font-size: 14px;">איפוס הגדרות</button>
    <div style="margin-top: 15px; padding: 10px; background: #f5f5f5; border-radius: 8px; font-size: 12px;">
      <strong>קיצורי מקלדת:</strong><br>
      <kbd>Tab</kbd> - ניווט<br>
      <kbd>Enter</kbd> - הפעלה<br>
      <kbd>Esc</kbd> - סגירה
    </div>
  `;
  
  // הוספה לדף
  document.body.appendChild(menu);
  
  // פונקציות נגישות
  window.increaseText = function() {
    var currentSize = parseFloat(getComputedStyle(document.body).fontSize);
    var newSize = currentSize + 2;
    document.body.style.fontSize = newSize + 'px';
    
    // הגדלת טקסט ספציפי לכל האלמנטים
    var elements = document.querySelectorAll('h1, h2, h3, p, span, div, button, input, select, label');
    elements.forEach(function(el) {
      var currentElSize = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (currentElSize + 2) + 'px';
    });
    
    console.log('טקסט הוגדל');
  };
  
  window.decreaseText = function() {
    var currentSize = parseFloat(getComputedStyle(document.body).fontSize);
    var newSize = currentSize - 2;
    document.body.style.fontSize = newSize + 'px';
    
    // הקטנת טקסט ספציפי לכל האלמנטים
    var elements = document.querySelectorAll('h1, h2, h3, p, span, div, button, input, select, label');
    elements.forEach(function(el) {
      var currentElSize = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = (currentElSize - 2) + 'px';
    });
    
    console.log('טקסט הוקטן');
  };
  
  window.toggleHighContrast = function() {
    var contrastBtn = document.getElementById('contrast-btn');
    var isHighContrast = document.body.classList.contains('high-contrast');
    
    document.body.classList.toggle('high-contrast');
    
    if (isHighContrast) {
      contrastBtn.textContent = 'ניגודיות גבוהה';
      console.log('ניגודיות רגילה');
    } else {
      contrastBtn.textContent = 'ניגודיות רגילה';
      console.log('ניגודיות גבוהה');
    }
  };
  
  window.toggleSpacing = function() {
    var spacingBtn = document.getElementById('spacing-btn');
    var isSpacingActive = document.body.classList.contains('increased-spacing');
    
    document.body.classList.toggle('increased-spacing');
    
    if (isSpacingActive) {
      spacingBtn.textContent = 'הגדלת רווחים';
      console.log('רווחים הוקטנו');
    } else {
      spacingBtn.textContent = 'הקטנת רווחים';
      console.log('רווחים הורחבו');
    }
  };
  
  window.resetAccessibility = function() {
    document.body.style.fontSize = '';
    document.body.classList.remove('high-contrast', 'increased-spacing');
    
    // איפוס גודל טקסט לכל האלמנטים
    var elements = document.querySelectorAll('h1, h2, h3, p, span, div, button, input, select, label');
    elements.forEach(function(el) {
      el.style.fontSize = '';
    });
    
    // איפוס טקסט כפתור הרווחים
    var spacingBtn = document.getElementById('spacing-btn');
    if (spacingBtn) {
      spacingBtn.textContent = 'הגדלת רווחים';
    }
    
    // איפוס טקסט כפתור הניגודיות
    var contrastBtn = document.getElementById('contrast-btn');
    if (contrastBtn) {
      contrastBtn.textContent = 'ניגודיות גבוהה';
    }
    
    console.log('הגדרות אופסו');
  };
  
  // פתיחה/סגירה של התפריט
  window.toggleAccessibilityMenu = function() {
    var menu = document.getElementById('accessibility-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      console.log('תפריט נגישות:', menu.style.display);
    }
  };
  
  // סגירת התפריט בלחיצה מחוץ לו
  document.addEventListener('click', function(e) {
    var menu = document.getElementById('accessibility-menu');
    var accessibilityBtn = document.getElementById('accessibility-btn');
    if (menu && accessibilityBtn && !menu.contains(e.target) && !accessibilityBtn.contains(e.target)) {
      menu.style.display = 'none';
    }
  });
  
  // קיצורי מקלדת
  document.addEventListener('keydown', function(e) {
    // Esc לסגירת התפריט
    if (e.key === 'Escape' && menu.style.display === 'block') {
      menu.style.display = 'none';
    }
    
    // קיצורי מקלדת לנגישות
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case '=':
        case '+':
          e.preventDefault();
          increaseText();
          break;
        case '-':
          e.preventDefault();
          decreaseText();
          break;
        case '0':
          e.preventDefault();
          resetAccessibility();
          break;
      }
    }
  });
  
  // ניווט במקלדת - דילוג על אלמנטים נסתרים
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      var focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      var elements = document.querySelectorAll(focusableElements);
      var firstElement = elements[0];
      var lastElement = elements[elements.length - 1];
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  });
  
  console.log('תוסף נגישות נטען בהצלחה');
}); 