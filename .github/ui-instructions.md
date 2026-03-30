# UI Instructions - shadcn/ui Components Mapping

## 🎨 Support Ticket System UI Component Structure

### 🔐 Authentication Pages (`(auth)/`)

#### Login Page
- **form** - Main login form wrapper
- **card** - Login card container
- **input** - Email and password fields
- **label** - Form field labels
- **button** - Submit and social login buttons
- **alert** - Error and success messages
- **separator** - Divider between form sections

#### Signup Page
- **form** - Registration form wrapper
- **card** - Signup card container
- **input** - User registration fields
- **label** - Form field labels
- **button** - Submit button
- **checkbox** - Terms and conditions agreement
- **alert** - Validation messages

#### Forgot Password Page
- **form** - Password reset form
- **card** - Reset request container
- **input** - Email input field
- **label** - Email field label
- **button** - Send reset link button
- **alert** - Status messages

#### Reset Password Page
- **form** - New password form
- **card** - Password reset container
- **input** - New password fields
- **label** - Password field labels
- **button** - Update password button
- **alert** - Success/error messages

### 📊 Dashboard Pages (`(dashboard)/`)

#### Main Dashboard Page
- **card** - Summary statistics cards
- **badge** - Status indicators and counters
- **progress** - SLA progress indicators
- **chart** - Data visualization components
- **skeleton** - Loading placeholders
- **tabs** - Dashboard section navigation
- **table** - Recent tickets overview
- **button** - Quick action buttons

#### Layout Components
- **navigation-menu** - Main navigation
- **breadcrumb** - Page navigation breadcrumbs
- **avatar** - User profile avatar
- **dropdown-menu** - User menu and settings
- **sheet** - Mobile navigation sidebar
- **scroll-area** - Scrollable content areas

### 🎫 Tickets Section

#### Tickets List Page
- **table** - Main tickets data table
- **badge** - Priority and status badges
- **button** - Action buttons (view, edit, delete)
- **input** - Search and filter inputs
- **select** - Filter dropdowns
- **calendar** - Date range picker
- **pagination** - Table pagination controls
- **card** - Ticket summary cards (mobile view)
- **skeleton** - Loading states

#### Ticket Creation Page
- **form** - Ticket creation form
- **card** - Form container
- **input** - Text input fields
- **textarea** - Description field
- **select** - Dropdown selections (project, priority, category)
- **label** - Form field labels
- **button** - Submit and cancel buttons
- **file-upload** - Attachment upload component
- **alert** - Validation and success messages
- **combobox** - Searchable select for assignments

#### Ticket Detail Page
- **card** - Ticket information container
- **badge** - Status and priority indicators
- **tabs** - Details, comments, history tabs
- **avatar** - User avatars in comments
- **button** - Action buttons
- **textarea** - Comment input
- **timeline** - Ticket activity timeline
- **dialog** - Confirmation modals
- **dropdown-menu** - Action menus

### 📁 Projects Section

#### Projects List Page
- **card** - Project cards grid
- **badge** - Project status indicators
- **button** - Action buttons
- **input** - Search functionality
- **select** - Filter options
- **skeleton** - Loading placeholders
- **pagination** - Projects pagination

#### Project Creation/Edit Page
- **form** - Project form wrapper
- **card** - Form container
- **input** - Project details fields
- **textarea** - Description field
- **select** - SLA configuration dropdowns
- **label** - Form labels
- **button** - Save and cancel buttons
- **alert** - Form validation messages
- **switch** - Toggle settings

#### Project Detail Page
- **card** - Project information
- **tabs** - Overview, tickets, settings tabs
- **table** - Project tickets table
- **badge** - Statistics and status
- **button** - Management actions
- **dialog** - Delete confirmation

### 📈 Reports Section

#### Reports Dashboard
- **card** - Report summary cards
- **chart** - Various chart components
- **table** - Detailed report tables
- **select** - Report filters
- **calendar** - Date range selection
- **button** - Export and print buttons
- **tabs** - Different report views
- **skeleton** - Chart loading states

#### Export/Download Features
- **dialog** - Export options modal
- **select** - Format selection
- **button** - Download triggers
- **progress** - Export progress indicator
- **alert** - Export status messages

### 🔔 Notification System

#### Notification Center
- **popover** - Notification dropdown
- **card** - Individual notification cards
- **badge** - Unread count indicator
- **button** - Mark as read actions
- **scroll-area** - Notification list scroll
- **separator** - Notification grouping
- **avatar** - User avatars in notifications

#### Notification Settings
- **form** - Settings form
- **card** - Settings container
- **switch** - Notification toggles
- **select** - Frequency options
- **label** - Setting labels
- **button** - Save settings button

### 🎯 General UI Components

#### Modals and Dialogs
- **dialog** - Main modal wrapper
- **alert-dialog** - Confirmation dialogs
- **sheet** - Side panel modals
- **drawer** - Mobile bottom sheet

#### Navigation
- **breadcrumb** - Page navigation
- **pagination** - Data navigation
- **tabs** - Content organization
- **navigation-menu** - Main navigation

#### Data Display
- **table** - Data tables
- **card** - Content containers
- **badge** - Status indicators
- **avatar** - User representations
- **chart** - Data visualization

#### Form Elements
- **form** - Form wrappers
- **input** - Text inputs
- **textarea** - Multi-line text
- **select** - Dropdown selections
- **combobox** - Searchable selects
- **checkbox** - Boolean inputs
- **radio-group** - Single choice options
- **switch** - Toggle controls
- **slider** - Range inputs
- **calendar** - Date pickers
- **file-upload** - File inputs

#### Feedback and Status
- **alert** - Messages and notifications
- **toast** - Temporary notifications
- **progress** - Loading indicators
- **skeleton** - Loading placeholders
- **spinner** - Loading animations

#### Utility Components
- **scroll-area** - Custom scrollbars
- **separator** - Visual dividers
- **tooltip** - Helpful hints
- **popover** - Contextual information
- **hover-card** - Preview information

## 📱 Mobile-Specific Components

#### Mobile Navigation
- **sheet** - Mobile menu drawer
- **drawer** - Bottom sheet actions
- **collapsible** - Expandable sections

#### Mobile Forms
- **drawer** - Bottom sheet forms
- **sheet** - Side panel forms

#### Mobile Data Display
- **card** - Mobile-optimized cards
- **accordion** - Collapsible data sections
- **collapsible** - Expandable content

## 🎨 Theming and Layout

#### Layout Components
- **container** - Page containers
- **grid** - Layout grids
- **flex** - Flexible layouts

#### Visual Enhancement
- **gradient** - Background gradients
- **blur** - Background blur effects
- **shadow** - Drop shadows

## 📋 Implementation Priority

### Phase 1 (Core Components)
- card, button, input, label, form
- table, badge, alert
- dialog, sheet

### Phase 2 (Enhanced UX)
- select, combobox, calendar
- tabs, navigation-menu, breadcrumb
- avatar, dropdown-menu

### Phase 3 (Advanced Features)
- chart, progress, skeleton
- toast, popover, tooltip
- accordion, collapsible

### Phase 4 (Polish & Mobile)
- drawer, sheet (mobile)
- scroll-area, separator
- hover-card, gradient effects

---

**Note**: This mapping follows the mobile-first responsive design principles outlined in the Copilot Instructions, ensuring optimal user experience across all device sizes while maintaining the clean code practices and performance optimization requirements.
