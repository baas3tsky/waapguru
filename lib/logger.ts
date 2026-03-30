// Safe logging utility for client-side and server-side
const isDevelopment = process.env.NODE_ENV === 'development'
const isClient = typeof window !== 'undefined'

export const logger = {
  error: (message: string, data?: unknown) => {
    if (isDevelopment && isClient) {
      console.error(message, data)
    }
  },
  warn: (message: string, data?: unknown) => {
    if (isDevelopment && isClient) {
      console.warn(message, data)
    }
  },
  info: (message: string, data?: unknown) => {
    if (isDevelopment && isClient) {
      console.info(message, data)
    }
  },
  log: (message: string, data?: unknown) => {
    if (isDevelopment && isClient) {
      console.log(message, data)
    }
  }
}
