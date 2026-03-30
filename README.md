# 🎫 Support Ticket System

ระบบจัดการ Support Ticket แบบครบครัน พัฒนาด้วย Next.js 16, TypeScript, และ TailwindCSS 4

## 🚀 Features

### 🎫 Ticket Management
- **Create Tickets**: Auto-generated ticket numbers (RHD-YYYYMMDD-XXXX format)
- **Status Tracking**: Open → In Progress → Resolved → Closed
- **Priority Levels**: Low, Medium, High
- **Categories**: Hardware, Software, Network, Security, Database, Other
- **File Attachments**: Support for images, documents, PDFs with drag-and-drop
- **Reporter Information**: Contact details for follow-up
- **Project Association**: Link tickets to specific projects

### 📊 Dashboard & Analytics
- Real-time ticket statistics
- SLA monitoring and alerts
- Priority distribution charts
- Status overview widgets
- Recent activity tracking

### Reports & Exports
- **Visual Analytics**: Interactive charts for Ticket Breakdown and Priority Distribution
- **Detailed Reports**: Supplier performance tables and comprehensive ticket lists
- **Export Functionality**: Export reports to Excel (.xlsx) formats
- **Filtering**: Advanced date range and status filtering

### 💬 Communication System
- **Comments**: Internal and external comments
- **File Sharing**: Attach files to comments
- **Change Logs**: Automatic tracking of all changes
- **Notifications**: Email notifications via Resend

### ⏰ SLA Management
- Configurable SLA deadlines by priority
- Visual SLA status indicators
- Overdue ticket alerts
- Response time tracking
- **Automated Checks**: Cron jobs for SLA monitoring

### Authentication System
- **Service**: Custom implementation using **SharePoint Lists** as the user database.
- **Method**: Passwordless Email Authentication (Magic Link).
- **Flow**:
  1. User enters email on login page.
  2. System validates email domain and generates a secure token.
  3. Token is stored in SharePoint "Users" list.
  4. **Resend** service sends an email with a verification link.
  5. User clicks link → System validates token against SharePoint.
  6. JWT Session cookie is created for persistent login.
- **Security**: 
  - Token expiration (1 hour)
  - HTTP-only cookies
  - Domain restriction validation

### �📎 File Management
- **Multiple File Upload**: Support for multiple files per ticket
- **File Types**: Images (JPEG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX, XLS, XLSX), Text files
- **File Size Limit**: 4MB per file
- **Preview & Download**: Direct file access with preview for images
- **Visual Indicators**: File attachment icons in ticket lists

### 🔄 Workflow Management
- Ticket assignment to suppliers/technicians
- Status change tracking
- Automated change logging
- Feedback collection system

 ### Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5
- **Styling**: TailwindCSS 4, Radix UI, shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Database**: SharePoint Lists (via Microsoft Graph)
- **Storage**: SharePoint Document Library
- **Authentication**: Custom Passwordless Auth (SharePoint Lists + Resend)
- **Email**: Resend
- **Reporting**: SheetJS (xlsx)ph Auth (SharePoint Users)
- **State Management**: React Hooks

## 🚦 Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [https://support-ticket-ruthvictor.vercel.app](https://support-ticket-ruthvictor.vercel.app) with your browser to see the result.

## 📁 Project Structure

```(Login/Logout)
│   ├── error/             # Auth error pages
│   ├── login/             # Login page
│   └── logout/            # Logout processing
├── (main)/                 # Main Application Layout
│   ├── dashboard/         # Dashboard overview
│   ├── projects/          # Project management
│   ├── reports/           # Reporting & Analytics
│   └── tickets/           # Ticket management
├── api/                    # API Routes
│   ├── auth/              # Authentication endpoints
│   ├── cron/              # Scheduled tasks (SLA checks)
│   ├── reports/           # Report data generation
│   ├── send-email/        # Email notification service
│   └── sync-project-status/ # Data synchronization
├── components/             # Reusable UI components
│   ├── reports/           # Reporting-specific components
│   └── ui/                # Base UI components (shadcn)
├── lib/                    # Utilities and Actions
│   ├── actions/           # Server Actions (Business Logic)
│   ├── sharepoint-storage.ts # Storage handling
│   └── graph-client.ts    # Microsoft Graph client
├── docs/                   # Additional Documentation
└── public/                # Static assets
```

## 📚 Documentation

Detailed documentation can be found in the `docs/` folder:
- [Authentication System](docs/AUTHENTICATION.md)
- [Email Configuration](docs/EMAIL_CONFIGURATION.md)
- [Notification Features](docs/NOTIFICATION_FEATURES.md)
- [Reporting Logic](docs/REPORTING_LOGIC.md)
- [Hydration Troubleshooting](docs/HYDRATION_FIX_GUIDE.md) 

```

## 🎯 Usage

### Creating a New Ticket
1. Navigate to `/tickets/create`
2. Fill in reporter information
3. Select category and priority
4. Attach files if needed
5. Submit to generate auto ticket number

### Managing Tickets
- View all tickets in `/tickets`
- Filter by status, priority, category
- Click on ticket to view details
- Add comments and track changes
- Update status and assign to team members

### Dashboard Overview
- Real-time statistics
- SLA monitoring
- Recent activity
- Priority distribution

## 🔧 Configuration

### SLA Settings
Edit `lib/sla-utils.ts` to configure:
- Priority-based deadlines
- Business hours
- Holiday schedules

### File Upload Settings
Edit `app/(main)/tickets/components/CreateTicketForm.tsx`:
- Maximum file size (currently 4MB)
- Allowed file types
- Upload validation rules

## 🚀 Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

For production deployment:
1. Configure SharePoint Site ID and Graph API credentials
2. Ensure SharePoint Lists and Document Libraries are created
3. Set up email notifications (Resend API Key)
4. Configure environment variables

## 📝 License

This project is licensed under the MIT License.
