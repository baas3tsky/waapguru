'use client'

import { useEffect, useRef } from 'react'

interface HydrationSafeWrapperProps {
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper component to handle browser extension interference
 * This removes attributes like fdprocessedid that cause hydration mismatches
 */
export function HydrationSafeWrapper({ children, className }: HydrationSafeWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      // Remove browser extension attributes that cause hydration issues
      const removeExtensionAttributes = (element: Element) => {
        // Common browser extension attributes that cause issues
        const problematicAttributes = [
          'fdprocessedid',
          'data-lastpass-icon-root',
          'data-bitwarden-watching',
          'data-kwift-data',
          'data-1p-ignore',
          'data-dashlane-rid'
        ]

        problematicAttributes.forEach(attr => {
          if (element.hasAttribute(attr)) {
            element.removeAttribute(attr)
          }
        })

        // Recursively clean child elements
        Array.from(element.children).forEach(removeExtensionAttributes)
      }

      // Clean the container and its children
      removeExtensionAttributes(containerRef.current)

      // Set up MutationObserver to clean newly added attributes
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.target instanceof Element) {
            const attributeName = mutation.attributeName
            if (attributeName && attributeName.includes('fdprocessedid')) {
              mutation.target.removeAttribute(attributeName)
            }
          }
        })
      })

      observer.observe(containerRef.current, {
        attributes: true,
        subtree: true,
        attributeFilter: ['fdprocessedid']
      })

      return () => observer.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className={className} suppressHydrationWarning>
      {children}
    </div>
  )
}
