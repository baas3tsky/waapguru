'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import type { ProjectFormData, Supplier, Reporter } from '@/types/project'
import { toInputDateString } from '@/lib/date-utils'

interface ProjectFormProps {
  initialData?: ProjectFormData
  onSubmit: (data: ProjectFormData) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
  isLoading?: boolean
  mode: 'create' | 'edit'
}

export function ProjectForm({ 
  initialData, 
  onSubmit, 
  onCancel,
  onDelete,
  isLoading = false,
  mode 
}: ProjectFormProps) {
  // ตรวจสอบและเพิ่ม ID ให้กับ suppliers ใน initialData ถ้ายังไม่มี
  const processedInitialData = initialData ? {
    ...initialData,
    signDate: toInputDateString(initialData.signDate),
    endDate: toInputDateString(initialData.endDate),
    suppliers: initialData.suppliers?.map((supplier, index) => ({
      ...supplier,
      id: supplier.id || `supplier-${Date.now()}-${index}`
    })) || [{
      id: `supplier-${Date.now()}-0`,
      name: 'Ruthvictor',
      email: '',
      telephone: ''
    }],
    reporters: Array.isArray(initialData.reporters) && initialData.reporters.length > 0
      ? initialData.reporters.map((reporter, index) => ({
          ...reporter,
          id: reporter.id || `reporter-${Date.now()}-${index}`
        }))
      : [] 
  } : undefined;

  console.log('🏗️ ProjectForm Initial Data Reporters:', initialData?.reporters);
  console.log('🏗️ ProjectForm Processed Reporters:', processedInitialData?.reporters);

  const [formData, setFormData] = useState<ProjectFormData>(processedInitialData || {
    projectCode: '',
    projectName: '',
    contactNumber: '',
    signDate: '',
    endDate: '',
    suppliers: [{
      id: `supplier-${Date.now()}-0`,
      name: 'Ruthvictor',
      email: '',
      telephone: ''
    }],
    reporters: [],
    slaLevel: {
      high: 4,
      medium: 8,
      low: 24
    },
    projectManager: {
      name: '',
      email: '',
      telephone: ''
    },
    status: 'Planning' // เพิ่ม default status
  })

  // Sync formData with initialData when it changes (critical for Edit mode)
  useEffect(() => {
    if (initialData) {
        setFormData(prev => {
            const next = {
                ...initialData,
                signDate: toInputDateString(initialData.signDate),
                endDate: toInputDateString(initialData.endDate),
                suppliers: initialData.suppliers?.map((supplier, index) => ({
                ...supplier,
                id: supplier.id || `supplier-${Date.now()}-${index}`
                })) || prev.suppliers,
                reporters: Array.isArray(initialData.reporters) && initialData.reporters.length > 0
                ? initialData.reporters.map((reporter, index) => ({
                    ...reporter,
                    id: reporter.id || `reporter-${Date.now()}-${index}`
                    }))
                : []
            };
            return next;
        });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate Reporters
    if (!formData.reporters || formData.reporters.length === 0) {
      alert('กรุณาเพิ่มข้อมูลผู้แจ้งปัญหา/ลูกค้า อย่างน้อย 1 รายชื่อ');
      return;
    }

    // Also validate if reporter name is filled
    const invalidReporter = formData.reporters.find(r => !r.name.trim());
    if (invalidReporter) {
      alert('กรุณากรอกชื่อผู้แจ้งปัญหาให้ครบถ้วน');
      return;
    }

    await onSubmit(formData)
  }

  const addSupplier = () => {
    setFormData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, { 
        id: `supplier-${Date.now()}-${prev.suppliers.length}`,
        name: 'Ruthvictor', 
        email: '', 
        telephone: '' 
      }]
    }))
  }

  const removeSupplier = (index: number) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter((_, i) => i !== index)
    }))
  }

  const updateSupplier = (index: number, field: keyof Supplier, value: string) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.map((supplier, i) => 
        i === index ? { ...supplier, [field]: value } : supplier
      )
    }))
  }

  const addReporter = () => {
    setFormData(prev => ({
      ...prev,
      reporters: [...(prev.reporters || []), { 
        id: `reporter-${Date.now()}-${(prev.reporters?.length || 0)}`,
        name: '', 
        email: '', 
        telephone: '' 
      }]
    }))
  }

  const removeReporter = (index: number) => {
    setFormData(prev => ({
      ...prev,
      reporters: prev.reporters?.filter((_, i) => i !== index) || []
    }))
  }

  const updateReporter = (index: number, field: keyof Reporter, value: string) => {
    setFormData(prev => ({
      ...prev,
      reporters: prev.reporters?.map((reporter, i) => 
        i === index ? { ...reporter, [field]: value } : reporter
      ) || []
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === 'create' ? 'ลงทะเบียนโครงการใหม่' : 'แก้ไขข้อมูลโครงการ'}
          </CardTitle>
          <CardDescription>
            กรอกข้อมูลโครงการและผู้ดูแลโครงการ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ข้อมูลโครงการ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ข้อมูลโครงการ</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="projectCode">เลขที่สัญญา *</Label>
                  <Input
                    id="projectCode"
                    value={formData.projectCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectCode: e.target.value }))}
                    required
                    placeholder="เช่น PRJ-2024-001"
                    suppressHydrationWarning
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectName">ชื่อโครงการ *</Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    required
                    placeholder="ชื่อโครงการ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signDate">วันที่เซ็นสัญญา *</Label>
                  <Input
                    id="signDate"
                    type="date"
                    value={formData.signDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, signDate: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">วันที่สิ้นสุดโครงการ</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactNumber">เบอร์ติดต่อ *</Label>
                  <Input
                    id="contactNumber"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactNumber: e.target.value }))}
                    required
                    placeholder="0XX-XXX-XXXX"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ข้อมูลผู้แจ้งปัญหา/ลูกค้า */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">ข้อมูลผู้แจ้งปัญหา/ลูกค้า (Reporters/Customer)</CardTitle>
                    <CardDescription>ระบุข้อมูลผู้แจ้งปัญหาหรือลูกค้าที่สามารถแจ้งปัญหาได้</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addReporter}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มผู้แจ้ง
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(formData.reporters || []).length === 0 && (
                  <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                    ยังไม่มีข้อมูลผู้แจ้งปัญหา
                  </div>
                )}
                {(formData.reporters || []).map((reporter, index) => (
                  <div key={reporter.id} className="p-4 border rounded-lg space-y-4 relative">
                    <div className="flex justify-between items-center">
                      <Badge variant="outline">ผู้แจ้ง {index + 1}</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeReporter(index)}
                        className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        ลบ
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`reporter-name-${index}`}>ชื่อ *</Label>
                        <Input
                          id={`reporter-name-${index}`}
                          value={reporter.name}
                          onChange={(e) => updateReporter(index, 'name', e.target.value)}
                          required
                          placeholder="ชื่อ-สกุล"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reporter-email-${index}`}>อีเมล *</Label>
                        <Input
                          id={`reporter-email-${index}`}
                          type="email"
                          value={reporter.email}
                          onChange={(e) => updateReporter(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`reporter-telephone-${index}`}>เบอร์โทรศัพท์</Label>
                        <Input
                          id={`reporter-telephone-${index}`}
                          value={reporter.telephone}
                          onChange={(e) => updateReporter(index, 'telephone', e.target.value)}
                          placeholder="0XX-XXX-XXXX"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ข้อมูลบริษัทผู้ดูแลโครงการ */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">บริษัทผู้ดูแลโครงการ (Suppliers)</CardTitle>
                    <CardDescription>สามารถระบุได้มากกว่า 1 ราย</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSupplier}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่ม Supplier
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.suppliers.map((supplier, index) => (
                  <div key={supplier.id} className="p-4 border rounded-lg space-y-4 relative">
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary">Supplier {index + 1}</Badge>
                      {formData.suppliers.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`คุณต้องการลบ Supplier "${supplier.name || `รายการที่ ${index + 1}`}" หรือไม่?`)) {
                              removeSupplier(index)
                            }
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          ลบ Supplier
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`supplier-name-${index}`}>ชื่อ *</Label>
                        <Input
                          id={`supplier-name-${index}`}
                          value={supplier.name}
                          onChange={(e) => updateSupplier(index, 'name', e.target.value)}
                          required
                          placeholder="ชื่อบริษัท"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`supplier-email-${index}`}>อีเมล</Label>
                        <Input
                          id={`supplier-email-${index}`}
                          type="email"
                          value={supplier.email}
                          onChange={(e) => updateSupplier(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`supplier-telephone-${index}`}>เบอร์โทรศัพท์</Label>
                        <Input
                          id={`supplier-telephone-${index}`}
                          value={supplier.telephone}
                          onChange={(e) => updateSupplier(index, 'telephone', e.target.value)}
                          placeholder="0XX-XXX-XXXX"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ระดับ SLA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ระดับ SLA (เวลาการแก้ไข)</CardTitle>
                <CardDescription>กำหนดระยะเวลาในการแก้ไขปัญหา (หน่วย: ชั่วโมง)</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sla-high">High Priority (hr) *</Label>
                  <Input
                    id="sla-high"
                    type="number"
                    min="1"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={formData.slaLevel.high === 0 ? '' : formData.slaLevel.high}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slaLevel: { ...prev.slaLevel, high: parseInt(e.target.value) || 0 }
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla-medium">Medium Priority (hr) *</Label>
                  <Input
                    id="sla-medium"
                    type="number"
                    min="1"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={formData.slaLevel.medium === 0 ? '' : formData.slaLevel.medium}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slaLevel: { ...prev.slaLevel, medium: parseInt(e.target.value) || 0 }
                    }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla-low">Low Priority (hr) *</Label>
                  <Input
                    id="sla-low"
                    type="number"
                    min="1"
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={formData.slaLevel.low === 0 ? '' : formData.slaLevel.low}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      slaLevel: { ...prev.slaLevel, low: parseInt(e.target.value) || 0 }
                    }))}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* ผู้จัดการโครงการ */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ผู้จัดการโครงการหรือผู้รับผิดชอบ</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pm-name">ชื่อ *</Label>
                  <Input
                    id="pm-name"
                    value={formData.projectManager.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      projectManager: { ...prev.projectManager, name: e.target.value }
                    }))}
                    required
                    placeholder="ชื่อ-สกุล"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-email">อีเมล *</Label>
                  <Input
                    id="pm-email"
                    type="email"
                    value={formData.projectManager.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      projectManager: { ...prev.projectManager, email: e.target.value }
                    }))}
                    required
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pm-telephone">เบอร์โทรศัพท์ *</Label>
                  <Input
                    id="pm-telephone"
                    value={formData.projectManager.telephone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      projectManager: { ...prev.projectManager, telephone: e.target.value }
                    }))}
                    required
                    placeholder="0XX-XXX-XXXX"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ปุ่มควบคุม */}
            <div className="flex justify-between items-center">
              {/* ปุ่มลบโครงการ (แสดงเฉพาะในโหมด edit) */}
              {mode === 'edit' && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (confirm('⚠️ คุณต้องการลบโครงการนี้หรือไม่?\n\nการลบจะไม่สามารถย้อนกลับได้ และอาจส่งผลต่อ Tickets ที่เกี่ยวข้อง')) {
                      await onDelete()
                    }
                  }}
                  disabled={isLoading}
                  className="mr-auto border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  ลบโครงการ
                </Button>
              )}
              
              {/* ปุ่มบันทึก/ยกเลิก */}
              <div className="flex justify-end space-x-4 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
                >
                  {isLoading ? 'กำลังบันทึก...' : mode === 'create' ? 'สร้างโครงการ' : 'บันทึกการแก้ไข'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
