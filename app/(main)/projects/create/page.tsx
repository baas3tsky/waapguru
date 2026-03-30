'use client'

import { useRouter } from 'next/navigation'
import { ProjectForm } from '../components/CreateProjectForm'
import { createProject } from '@/lib/actions/sharepoint-project-service'
import type { ProjectFormData } from '@/types/project'
import { useState } from 'react'

export default function CreateProjectPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      setIsLoading(true)
      await createProject(data)
      alert('สร้างโครงการเรียบร้อยแล้ว')
      router.refresh()
      router.push('/projects')
    } catch (err) {
      console.error('Failed to create project:', err)
      alert('เกิดข้อผิดพลาดในการสร้างโครงการ: ' + (err instanceof Error ? err.message : 'ข้อผิดพลาดไม่ทราบสาเหตุ'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push('/projects')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <ProjectForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  )
}
