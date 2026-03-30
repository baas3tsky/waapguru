export type SLALevel = {
  high: number; // ชั่วโมง
  medium: number; // ชั่วโมง
  low: number; // ชั่วโมง
}

export type Supplier = {
  id?: string;
  name: string;
  email: string;
  telephone: string;
}

export type ProjectManager = {
  name: string;
  email: string;
  telephone: string;
}

export type Reporter = {
  id?: string;
  name: string;
  email: string;
  telephone: string;
}

// สถานะโครงการ
export type ProjectStatus = 'Planning' | 'Active' | 'Completed';

export type Project = {
  id?: string;
  projectCode: string; // เลขที่สัญญา
  projectName: string; // ชื่อโครงการ
  contactNumber: string; // เบอร์ติดต่อ
  signDate: string; // วันที่เซ็นสัญญา
  endDate?: string; // วันที่สิ้นสุดโครงการ
  suppliers: Supplier[]; // ข้อมูลบริษัทผู้ดูแลโครงการ
  slaLevel: SLALevel; // ระดับ SLA
  projectManager: ProjectManager; // ผู้จัดการโครงการ
  reporters?: Reporter[]; // ผู้แจ้งปัญหา/ลูกค้า
  status?: ProjectStatus; // สถานะโครงการ (Planning, Active, Completed, On Hold)
  createdAt?: string;
  updatedAt?: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;
