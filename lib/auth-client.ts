/**
 * Client-side auth utilities
 */

'use client'

import { useEffect, useState } from 'react'

export interface Session {
  userId: string
  email: string
  name: string
}

/**
 * Check if user has a valid session
 * This is a client-side check that reads from server-set cookies
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if session cookie exists
    async function checkSession() {
      try {
        const response = await fetch('/api/session')
        if (response.ok) {
          const data = await response.json()
          if (data.user) {
            setSession({
              userId: data.user.id,
              email: data.user.email,
              name: data.user.fullName
            })
          } else {
            setSession(null)
          }
        } else {
          setSession(null)
        }
      } catch (error) {
        console.error('Session check failed:', error)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  return {
    session,
    loading,
    isAuthenticated: !!session
  }
}

/**
 * Logout function
 */
export async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
