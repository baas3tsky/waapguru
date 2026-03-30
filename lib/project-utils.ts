/**
 * Project Utilities
 * Helper functions สำหรับจัดการโครงการ
 */

import { Project, ProjectStatus } from '@/types/project';
import { Ticket } from '@/types/ticket';

/**
 * คำนวณสถานะโครงการอัตโนมัติจากข้อมูล
 * 
 * เงื่อนไข:
 * - Planning: ยังไม่มี Ticket เลย (รอสร้างตั๋วแรก)
 * - Active: มี Ticket อย่างน้อย 1 รายการที่ยังไม่ปิด
 * - Completed: มี Ticket และทุก Ticket ถูกปิดแล้ว
 */
export function calculateProjectStatus(
  project: Project,
  tickets?: Ticket[]
): ProjectStatus {
  // ถ้าไม่มี Ticket เลย = Planning (รอสร้างตั๋วแรก)
  if (!tickets || tickets.length === 0) {
    return 'Planning';
  }

  // มี tickets แล้ว - ตรวจสอบสถานะ
  const hasOpenTickets = tickets.some(
    ticket => ticket.status !== 'Closed'
  );

  // ถ้ามี Ticket ที่ยังไม่ปิด = Active
  if (hasOpenTickets) {
    return 'Active';
  }

  // ทุก Ticket ปิดหมดแล้ว = Completed
  return 'Completed';
}

/**
 * รับสีและข้อความสำหรับแสดง Badge ตามสถานะ
 */
export function getProjectStatusBadgeConfig(status?: ProjectStatus) {
  switch (status) {
    case 'Planning':
      return {
        label: 'Planning',
        className: 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200'
      };
    case 'Active':
      return {
        label: 'Active',
        className: 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200'
      };
    case 'Completed':
      return {
        label: 'Completed',
        className: 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200'
      };
    default:
      return {
        label: 'Unknown',
        className: 'inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200'
      };
  }
}

/**
 * กรองโครงการตามสถานะ
 */
export function filterProjectsByStatus(
  projects: Project[],
  status: ProjectStatus
): Project[] {
  return projects.filter(project => project.status === status);
}

/**
 * นับจำนวนโครงการแยกตามสถานะ
 */
export function countProjectsByStatus(projects: Project[]): Record<ProjectStatus, number> {
  return {
    Planning: projects.filter(p => p.status === 'Planning').length,
    Active: projects.filter(p => p.status === 'Active').length,
    Completed: projects.filter(p => p.status === 'Completed').length
  };
}
