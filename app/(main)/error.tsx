'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto p-6 flex items-center justify-center h-64">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-lg font-medium">เกิดข้อผิดพลาด</h2>
          <p className="text-muted-foreground">
            ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง
          </p>
        </div>
        <Button onClick={reset}>
          ลองใหม่
        </Button>
      </div>
    </div>
  )
}
