// Pre-hydration script to prevent browser extension interference
// This script runs before React hydration to clean problematic attributes

(function() {
  'use strict';
  
  // List of problematic attributes from browser extensions
  const PROBLEMATIC_ATTRIBUTES = [
    'fdprocessedid',
    'data-lastpass-icon-root', 
    'data-bitwarden-watching',
    'data-kwift-data',
    'data-1p-ignore',
    'data-dashlane-rid',
    'data-protonpass-root'
  ];

  // Function to clean attributes
  function cleanElement(element) {
    if (!element || typeof element.removeAttribute !== 'function') return;
    
    PROBLEMATIC_ATTRIBUTES.forEach(attr => {
      if (element.hasAttribute && element.hasAttribute(attr)) {
        try {
          element.removeAttribute(attr);
        } catch {
          // Silently ignore errors
        }
      }
    });
  }

  // Clean all existing elements
  function cleanAllElements() {
    try {
      const allElements = document.querySelectorAll('*');
      allElements.forEach(cleanElement);
    } catch {
      // Silently ignore errors
    }
  }

  // Run immediately if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanAllElements);
  } else {
    cleanAllElements();
  }

  // MutationObserver removed to improve performance
})();
