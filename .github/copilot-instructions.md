# Copilot Instructions สำหรับ Support Ticket System

## 🏗️ System Overview
สร้างระบบ Support Ticket System สำหรับจัดการโครงการและปัญหาต่างๆ ที่เกิดขึ้น รองรับการทำงานแบบ multi-project และมีระบบ SLA tracking ครอบคลุม 9 ระบบหลัก:

1. **Project Registration** - ลงทะเบียนโครงการพร้อม SLA config
2. **Ticket Creation** - สร้างและเชื่อมโยงกับโครงการ  
3. **Auto Ticket Numbering** - รูปแบบ RHD-YYYYMMDD-XXXX
4. **Dashboard & Filtering** - แดชบอร์ดพร้อม SLA tracking
5. **Assignment System** - มอบหมายงานให้ Suppliers
6. **Notification System** - แจ้งเตือนตาม SLA และสถานะ
7. **Status Tracking** - ติดตามและ change logs
8. **Feedback System** - ปิด ticket พร้อมคะแนนความพึงพอใจ
9. **Reports & Analytics** - รายงานและสถิติครบถ้วน

## 📚 Tech Stack
**Framework**: Next.js 15+ with App Router  
**Language**: TypeScript  
**Database**: SharePoint Lists (via Microsoft Graph)  
**Styling**: TailwindCSS + shadcn/ui  
**Authentication**: Microsoft Graph Auth (SharePoint Users)  
**File Upload**: SharePoint Document Library  

## 🎯 Core Development Principles

### 📱 Responsive Web Design
- **Mobile-First Approach**: เริ่มออกแบบจาก mobile แล้วขยายไป desktop
- **Breakpoints Strategy**:
  - Mobile: 320px - 768px (sm)
  - Tablet: 768px - 1024px (md, lg)
  - Desktop: 1024px+ (xl, 2xl)
- **Flexible Layout Patterns**:
  - ใช้ CSS Grid และ Flexbox สำหรับ responsive layouts
  - ใช้ TailwindCSS responsive utilities (sm:, md:, lg:, xl:, 2xl:)
  - Adaptive components ที่ปรับรูปแบบตามขนาดหน้าจอ
- **Content Strategy**:
  - Progressive disclosure สำหรับ mobile
  - Collapsible navigation และ sidebar
  - Touch-friendly UI elements (minimum 44px touch targets)
  - Adaptive typography scaling

### ⚡ Performance Optimization
- **Bundle Optimization**:
  - ใช้ Dynamic imports สำหรับ code splitting
  - Tree shaking และ bundle analysis
  - Optimize dependencies และลบ unused packages
- **Image & Asset Optimization**:
  - ใช้ Next.js Image component พร้อม lazy loading
  - WebP format สำหรับ modern browsers
  - Proper image sizing และ responsive images
  - Compress และ optimize static assets
- **Caching Strategy**:
  - Browser caching สำหรับ static assets
  - ISR (Incremental Static Regeneration) สำหรับ dynamic content
  - Implement proper Cache-Control headers
- **Database Performance**:
  - Optimize Graph API queries
  - Implement pagination สำหรับ large datasets
  - Use caching for static data
  - Monitor API rate limits
- **Core Web Vitals Targets**:
  - LCP (Largest Contentful Paint) < 2.5s
  - FID (First Input Delay) < 100ms
  - CLS (Cumulative Layout Shift) < 0.1

### 🧹 Clean Code Practices
- **Code Organization**:
  - Feature-based folder structure
  - Separation of concerns (UI, Logic, Data)
  - Consistent naming conventions (camelCase, PascalCase)
  - Single Responsibility Principle
- **TypeScript Best Practices**:
  - Strict mode enabled
  - Proper type definitions และ interfaces
  - Avoid `any` type - ใช้ proper typing
  - Custom utility types สำหรับ reusability
- **Component Design**:
  - Reusable และ composable components
  - Props interface definitions
  - Default props และ prop validation
  - Component documentation พร้อม examples
- **Function & Logic**:
  - Pure functions where possible
  - Avoid side effects ใน rendering
  - Custom hooks สำหรับ logic reusability
  - Error boundary implementation
- **Code Quality Tools**:
  - ESLint กับ TypeScript rules
  - Prettier สำหรับ code formatting
  - Husky สำหรับ pre-commit hooks
  - Comment code ที่ซับซ้อน

### 🔒 Security Implementation
- **Authentication & Authorization**:
  - Microsoft Graph Auth integration
  - Role-based access control (RBAC) via SharePoint Groups
  - Secure session management (JWT)
  - Multi-factor authentication support (via Microsoft 365)
- **Data Protection**:
  - SharePoint Permissions
  - Input validation และ sanitization
  - SQL injection prevention
  - XSS protection measures
- **API Security**:
  - Rate limiting implementation
  - CORS configuration
  - API key management
  - Request/Response validation
- **Infrastructure Security**:
  - HTTPS everywhere (SSL/TLS)
  - Environment variables สำหรับ sensitive data
  - Secure headers configuration
  - Regular security audits
- **Code Security**:
  - TypeScript strict mode
  - Dependency vulnerability scanning
  - Secure coding practices
  - Error handling without information leakage

### 🏗️ Architecture & Rendering Strategy

**80% RSC (Server Components)**: Data fetching, static content, layouts  
**20% CSC (Client Components)**: Forms, real-time updates, complex interactions  
- ใช้ Hybrid Pattern: RSC wrapper → CSC interactive parts
- ใช้ Suspense และ Loading UI สำหรับ better UX
- ใช้ Next.js Image optimization
- ใช้ Static Generation (SSG) สำหรับหน้าที่ไม่เปลี่ยนแปลงบ่อย

**RSC vs CSC Guidelines**

Use RSC for:
- Dashboard pages and data display
- Tables, charts, and reports
- Layout components (header, sidebar, footer)
- Static content and information pages
- SEO-critical pages

Use CSC only for:
- Forms with complex validation
- Real-time notifications
- Interactive filters and search
- Modal dialogs with state
- Drag & drop interfaces

### 📋 Code Simplicity & Validation Strategy

- ใช้ Server Actions แทน API routes ทุกที่ที่เป็นไปได้
- ใช้ Form Actions สำหรับการส่งข้อมูล
- **Validation Approach**: Hybrid method combining:
  - Database schema constraints (security layer)
  - Server-side validation in Server Actions (business logic)
  - Optional client-side validation for UX (progressive enhancement)
- ใช้ shadcn/ui components เพื่อลดการเขียน custom CSS
