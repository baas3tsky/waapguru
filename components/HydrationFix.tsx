'use client'

import { useEffect } from 'react'

/**
 * Client-side script to handle browser extension attributes
 * that cause hydration mismatches.
 * Optimized to run only once on mount to avoid performance issues.
 */
export function HydrationFix() {
  useEffect(() => {
    // Function to clean extension attributes
    const cleanExtensionAttributes = () => {
      const problematicAttributes = [
        'fdprocessedid',
        'data-lastpass-icon-root',
        'data-bitwarden-watching',
        'data-kwift-data',
        'data-1p-ignore',
        'data-dashlane-rid'
      ]

      // Clean all elements on the page
      const allElements = document.querySelectorAll('*')
      allElements.forEach(element => {
        problematicAttributes.forEach(attr => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr)
          }
        })
      })
    }

    // Clean immediately on mount
    cleanExtensionAttributes()
    
    // No MutationObserver here to avoid performance issues
  }, [])

  return null
}
