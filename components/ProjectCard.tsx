'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Eye, Trash2, Calendar, Phone, Mail, User } from 'lucide-react'
import type { Project } from '@/types/project'

interface ProjectCardProps {
  project: Project
  onView: (project: Project) => void
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({ project, onView, onEdit, onDelete }: ProjectCardProps) {
  // Local formatDate function to avoid module resolution issues
  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '';
    
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return '';
      }
      
      return dateObj.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg">{project.projectName}</CardTitle>
            <CardDescription className="flex items-center gap-2">
              <Badge variant="outline">{project.projectCode}</Badge>
              <span className="flex items-center gap-1 text-sm">
                <Calendar className="w-3 h-3" />
                {formatDate(project.signDate)}
              </span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(project)}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(project)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onDelete(project)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ข้อมูลติดต่อ */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="w-4 h-4" />
          {project.contactNumber}
        </div>

        {/* ผู้จัดการโครงการ */}
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            ผู้จัดการโครงการ
          </div>
          <div className="pl-6 space-y-1 text-sm">
            <div>{project.projectManager.name}</div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="w-3 h-3" />
              {project.projectManager.email}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="w-3 h-3" />
              {project.projectManager.telephone}
            </div>
          </div>
        </div>

        {/* SLA Level */}
        <div className="space-y-2">
          <div className="text-sm font-medium">SLA Level</div>
          <div className="flex gap-2">
            <Badge variant="destructive" className="text-xs">
              High: {project.slaLevel.high}h
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Medium: {project.slaLevel.medium}h
            </Badge>
            <Badge variant="outline" className="text-xs">
              Low: {project.slaLevel.low}h
            </Badge>
          </div>
        </div>

        {/* Suppliers */}
        <div className="space-y-2">
          <div className="text-sm font-medium">
            Suppliers ({project.suppliers.length} ราย)
          </div>
          <div className="space-y-1">
            {project.suppliers.slice(0, 2).map((supplier, index) => (
              <div key={index} className="text-xs text-muted-foreground pl-4">
                • {supplier.name}
              </div>
            ))}
            {project.suppliers.length > 2 && (
              <div className="text-xs text-muted-foreground pl-4">
                และอีก {project.suppliers.length - 2} ราย...
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
