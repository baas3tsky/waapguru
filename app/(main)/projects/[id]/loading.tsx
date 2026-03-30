import { RefreshCw } from 'lucide-react'

export default function Loading() {
  return (
    <div className="container mx-auto p-6 flex items-center justify-center h-64">
      <div className="flex items-center space-x-2">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span>กำลังโหลดข้อมูลโครงการ...</span>
      </div>
    </div>
  )
}
