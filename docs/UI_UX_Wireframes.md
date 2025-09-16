# UI/UX Wireframes and Mockups
## Smart City Management Platform

**Version:** 1.0  
**Date:** September 15, 2025  
**Design System:** Modern, Clean, Responsive  

---

## Table of Contents

1. [Design Principles](#design-principles)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Component Library](#component-library)
5. [Page Wireframes](#page-wireframes)
6. [Responsive Design](#responsive-design)
7. [Accessibility Guidelines](#accessibility-guidelines)

---

## 1. Design Principles

### 1.1 Visual Hierarchy
- **Clear Information Architecture**: Organized layout with logical grouping
- **Consistent Navigation**: Fixed sidebar with role-based menu items
- **Progressive Disclosure**: Show relevant information based on user context
- **Visual Cues**: Use color, size, and spacing to guide user attention

### 1.2 User Experience Goals
- **Efficiency**: Quick access to critical information
- **Clarity**: Clear data presentation with minimal cognitive load
- **Responsiveness**: Real-time updates without page refreshes
- **Accessibility**: WCAG 2.1 AA compliance for all users

---

## 2. Color Palette

### 2.1 Primary Colors
```css
--primary-blue: #1e40af;      /* Main brand color */
--primary-blue-light: #3b82f6;
--primary-blue-dark: #1e3a8a;
--secondary-green: #059669;    /* Success/positive indicators */
--secondary-orange: #ea580c;   /* Warning indicators */
--danger-red: #dc2626;         /* Error/critical alerts */
```

### 2.2 Neutral Colors
```css
--gray-50: #f9fafb;   /* Light backgrounds */
--gray-100: #f3f4f6;  /* Card backgrounds */
--gray-200: #e5e7eb;  /* Borders */
--gray-400: #9ca3af;  /* Disabled text */
--gray-600: #4b5563;  /* Secondary text */
--gray-800: #1f2937;  /* Primary text */
--gray-900: #111827;  /* Headers */
```

### 2.3 Alert Colors
```css
--alert-critical: #dc2626;  /* Critical alerts */
--alert-high: #ea580c;      /* High priority */
--alert-medium: #d97706;    /* Medium priority */
--alert-low: #059669;       /* Low priority */
--alert-info: #2563eb;      /* Information */
```

---

## 3. Typography

### 3.1 Font Family
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### 3.2 Type Scale
```css
--text-xs: 0.75rem;     /* 12px - Small labels */
--text-sm: 0.875rem;    /* 14px - Body text small */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Large body */
--text-xl: 1.25rem;     /* 20px - Small headings */
--text-2xl: 1.5rem;     /* 24px - Section headings */
--text-3xl: 1.875rem;   /* 30px - Page titles */
--text-4xl: 2.25rem;    /* 36px - Main headings */
```

### 3.3 Font Weights
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 4. Component Library

### 4.1 Layout Components

#### Header Component
```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Smart City Management        [🔔] [👤] [Settings] [Logout] │
└─────────────────────────────────────────────────────────────────┘
```

#### Sidebar Navigation
```
┌─────────────────┐
│ 📊 Dashboard     │ ← Active
│ 📈 Analytics     │
│ 🚨 Alerts        │
│ 👥 Users         │ ← Admin only
│ ⚙️  Settings      │
│                 │
│ Quick Stats:    │
│ • Active Alerts │
│   [12] Critical │
│   [8]  High     │
│   [15] Medium   │
│                 │
│ • System Status │
│   🟢 All Good   │
└─────────────────┘
```

### 4.2 Data Visualization Components

#### Chart Card Template
```
┌───────────────────────────────────────┐
│ [📊] Chart Title              [⋯ Menu] │
├───────────────────────────────────────┤
│                                       │
│           Chart/Graph Area            │
│              (350px min)              │
│                                       │
├───────────────────────────────────────┤
│ Last Updated: 2 minutes ago     [🔄]  │
└───────────────────────────────────────┘
```

#### KPI Card Template
```
┌─────────────────────┐
│ [📈] KPI Name       │
│                     │
│      125.5          │
│      (metric)       │
│                     │
│ +12.3% from last    │
│ week                │
└─────────────────────┘
```

### 4.3 Alert Components

#### Alert Card
```
┌─────────────────────────────────────────────────┐
│ [🔴] CRITICAL   Air Quality Alert   [⋯ Actions] │
├─────────────────────────────────────────────────┤
│ PM2.5 levels exceed safe threshold              │
│ Location: Downtown District                     │
│ Current: 89 μg/m³ | Threshold: 50 μg/m³        │
│                                                 │
│ Assigned to: Environmental Team                 │
│ Created: 2 hours ago                           │
│                                                 │
│ [Acknowledge] [Assign] [View Details]          │
└─────────────────────────────────────────────────┘
```

---

## 5. Page Wireframes

### 5.1 Login Page
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    [Smart City Logo]                        │
│                Smart City Management                        │
│                                                             │
│            ┌─────────────────────────────────┐              │
│            │                                 │              │
│            │  Email Address                  │              │
│            │  [________________________]    │              │
│            │                                 │              │
│            │  Password                       │              │
│            │  [________________________]    │              │
│            │                                 │              │
│            │  [ ] Remember me                │              │
│            │                                 │              │
│            │      [  Sign In  ]              │              │
│            │                                 │              │
│            │     Forgot Password?            │              │
│            │                                 │              │
│            └─────────────────────────────────┘              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Smart City Management           [🔔 3] [👤 John Doe] [⚙️] [Logout]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────┐ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Navigation  │ │ Main Content Area                                           │ │
│ │             │ │                                                             │ │
│ │ Dashboard   │ │ ┌─────────────────── Dashboard Overview ─────────────────┐ │ │
│ │ Analytics   │ │ │                                                         │ │ │
│ │ Alerts      │ │ │ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │ │ │
│ │ Users       │ │ │ │Air Quality│ │ Traffic │ │ Energy  │ │  Waste  │       │ │ │
│ │ Settings    │ │ │ │   Good    │ │  Heavy  │ │ Normal  │ │ 78% Full│       │ │ │
│ │             │ │ │ │   🟢     │ │   🟡    │ │   🟢   │ │   🟡   │       │ │ │
│ │ Quick Stats │ │ │ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │ │ │
│ │ 🚨 12 Active│ │ │                                                         │ │ │
│ │ 🟢 98% Up   │ │ │ ┌─────────────────┐ ┌─────────────────────────────────┐ │ │ │
│ │ 📊 Live     │ │ │ │   City Map       │ │      Recent Alerts             │ │ │ │
│ │             │ │ │ │                 │ │                                 │ │ │ │
│ │             │ │ │ │   [Map View]    │ │ 🔴 Critical: Air Quality         │ │ │ │
│ │             │ │ │ │                 │ │ 🟡 Medium: Traffic Jam           │ │ │ │
│ │             │ │ │ │                 │ │ 🟢 Low: Sensor Maintenance       │ │ │ │
│ │             │ │ │ └─────────────────┘ └─────────────────────────────────┘ │ │ │
│ │             │ │ │                                                         │ │ │
│ │             │ │ │ ┌─────────────────────────────────────────────────────┐ │ │ │
│ │             │ │ │ │           Real-time Data Charts                     │ │ │ │
│ │             │ │ │ │ [Line Chart: Air Quality] [Bar Chart: Traffic]     │ │ │ │
│ │             │ │ │ └─────────────────────────────────────────────────────┘ │ │ │
│ │             │ │ └─────────────────────────────────────────────────────────┘ │ │
│ │             │ │                                                             │ │
│ └─────────────┘ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Analytics Page
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Analytics Dashboard                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────────────── Filters ───────────────────────────────────────────┐   │
│ │ Date Range: [Last 30 Days ▼] Category: [All ▼] Location: [All ▼] [Apply] │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐   │
│ │                          Trend Analysis                                     │   │
│ │ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────────────┐ │   │
│ │ │ Air Quality     │ │ Traffic Flow    │ │ Energy Consumption              │ │   │
│ │ │                 │ │                 │ │                                 │ │   │
│ │ │ [Line Graph]    │ │ [Area Chart]    │ │ [Stacked Bar Chart]             │ │   │
│ │ │                 │ │                 │ │                                 │ │   │
│ │ │ Trend: ↗ +5%    │ │ Peak: 8AM-9AM   │ │ Peak: 6PM-8PM                   │ │   │
│ │ └─────────────────┘ └─────────────────┘ └─────────────────────────────────┘ │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ ┌─────────────────────────────────────────────────────────────────────────────┐   │
│ │                         Predictive Insights                                 │   │
│ │                                                                             │   │
│ │ Next 7 Days Forecast:                                                       │   │
│ │ • Air Quality: Expected to improve by 15%                                   │   │
│ │ • Traffic: Rush hour delays may increase due to construction                │   │
│ │ • Energy: Peak demand predicted for Thursday 7PM                           │   │
│ │                                                                             │   │
│ │ Recommendations:                                                            │   │
│ │ 1. Deploy additional air quality sensors in high-pollution areas           │   │
│ │ 2. Optimize traffic light timing during peak hours                         │   │
│ │ 3. Schedule non-essential energy usage outside peak times                  │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Alert Management Page
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Alert Management                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─── Alert Summary ───┐ ┌─────────── Filters ──────────────────────────────┐    │
│ │ Active: 23          │ │ Status: [All ▼] Severity: [All ▼] [Search...]   │    │
│ │ Critical: 5         │ └─────────────────────────────────────────────────────┘    │
│ │ High: 8             │                                                         │
│ │ Medium: 10          │ ┌─────────────────────────────────────────────────────┐   │
│ └─────────────────────┘ │                  Alert List                         │   │
│                         │                                                     │   │
│ ┌─────────────────────────────────────────────────────────────────────────────┐   │
│ │ 🔴 CRITICAL | Air Quality Alert                            | 2 hours ago   │   │
│ │    PM2.5 levels at 89 μg/m³ (threshold: 50 μg/m³)                         │   │
│ │    📍 Downtown District | Assigned: Environmental Team                     │   │
│ │    [Acknowledge] [View Details] [Assign]                                   │   │
│ ├─────────────────────────────────────────────────────────────────────────────┤   │
│ │ 🟡 HIGH | Traffic Congestion                               | 45 min ago    │   │
│ │    Severe delays on Main Street intersection                               │   │
│ │    📍 City Center | Assigned: Traffic Control                             │   │
│ │    [Acknowledge] [View Details] [Assign]                                   │   │
│ ├─────────────────────────────────────────────────────────────────────────────┤   │
│ │ 🟠 MEDIUM | Waste Collection Alert                         | 3 hours ago   │   │
│ │    Container 85% full - schedule collection                                │   │
│ │    📍 Residential Area B | Assigned: Waste Management                      │   │
│ │    [Acknowledge] [View Details] [Assign]                                   │   │
│ └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│ [Bulk Actions ▼] [Export Report] [Alert Settings]                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 User Management Page (Admin Only)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              User Management                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ ┌─────────────────────┐ [+ Add New User] [Import Users] [Export List]         │
│ │ Total Users: 47     │                                                       │
│ │ Active: 45          │ ┌─────────── Search & Filter ─────────────────────┐    │
│ │ Inactive: 2         │ │ [Search by name/email...] Role: [All ▼] [Apply] │    │
│ │ Admins: 3           │ └─────────────────────────────────────────────────┘    │
│ └─────────────────────┘                                                       │
│                                                                               │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Name              | Email              | Role        | Status  | Last Login │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ John Doe          | john@city.gov      | Admin       | Active  | 2h ago     │ │
│ │ [Edit] [Deactivate] [Reset Password]                                       │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ Jane Smith        | jane@city.gov      | Env Officer | Active  | 1d ago     │ │
│ │ [Edit] [Deactivate] [Reset Password]                                       │ │
│ ├─────────────────────────────────────────────────────────────────────────────┤ │
│ │ Mike Johnson      | mike@city.gov      | Traffic Ctrl| Active  | 3h ago     │ │
│ │ [Edit] [Deactivate] [Reset Password]                                       │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│ [Previous] Page 1 of 3 [Next]                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Responsive Design

### 6.1 Breakpoints
```css
/* Mobile First Approach */
--breakpoint-sm: 640px;   /* Small tablets */
--breakpoint-md: 768px;   /* Tablets */
--breakpoint-lg: 1024px;  /* Small laptops */
--breakpoint-xl: 1280px;  /* Desktops */
--breakpoint-2xl: 1536px; /* Large screens */
```

### 6.2 Mobile Layout (< 768px)
```
┌─────────────────────┐
│ [☰] Smart City [🔔] │ ← Hamburger menu
├─────────────────────┤
│                     │
│ ┌─────────────────┐ │ ← Stacked cards
│ │ Air Quality     │ │
│ │ Status: Good    │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Traffic         │ │
│ │ Status: Heavy   │ │
│ └─────────────────┘ │
│                     │
│ ┌─────────────────┐ │
│ │ Recent Alerts   │ │
│ │ • Critical: 2   │ │
│ │ • High: 5       │ │
│ └─────────────────┘ │
│                     │
│     [View More]     │
└─────────────────────┘
```

### 6.3 Tablet Layout (768px - 1024px)
```
┌─────────────────────────────────────┐
│ [Logo] Smart City      [🔔] [👤] [⚙️] │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │ ← 2-3 columns
│ │Air Qual │ │Traffic  │ │ Energy  │ │
│ │ Good    │ │ Heavy   │ │ Normal  │ │
│ └─────────┘ └─────────┘ └─────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         City Map                │ │
│ │     [Interactive Map]           │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │       Recent Alerts             │ │
│ │ [Alert List - Compact View]     │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 7. Accessibility Guidelines

### 7.1 Color Accessibility
- **Contrast Ratio**: Minimum 4.5:1 for normal text, 3:1 for large text
- **Color Independence**: Never rely solely on color to convey information
- **Color Blind Friendly**: Use patterns and icons alongside colors

### 7.2 Keyboard Navigation
- **Tab Order**: Logical tab sequence through all interactive elements
- **Focus Indicators**: Clear visual focus indicators for keyboard users
- **Shortcuts**: Keyboard shortcuts for frequently used actions

### 7.3 Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy and landmark roles
- **Alt Text**: Descriptive alt text for all images and charts
- **ARIA Labels**: Appropriate ARIA labels for complex components
- **Live Regions**: ARIA live regions for dynamic content updates

### 7.4 Motion and Animation
- **Reduced Motion**: Respect user's motion preferences
- **Essential Animation**: Only use animation that serves a functional purpose
- **Controls**: Provide controls to pause or disable animations

---

## 8. Component States

### 8.1 Button States
```css
/* Primary Button */
.btn-primary {
  background: var(--primary-blue);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-blue-dark);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: var(--gray-400);
  cursor: not-allowed;
}
```

### 8.2 Alert States
```css
.alert-critical {
  border-left: 4px solid var(--danger-red);
  background: rgba(220, 38, 38, 0.1);
}

.alert-high {
  border-left: 4px solid var(--secondary-orange);
  background: rgba(234, 88, 12, 0.1);
}

.alert-medium {
  border-left: 4px solid var(--amber-500);
  background: rgba(245, 158, 11, 0.1);
}

.alert-low {
  border-left: 4px solid var(--secondary-green);
  background: rgba(5, 150, 105, 0.1);
}
```

### 8.3 Loading States
```
┌─────────────────────┐
│ Loading...          │
│ [███████████▒▒▒]    │ ← Progress bar
│ Fetching data...    │
└─────────────────────┘
```

---

## Document Control
- **Last Updated**: September 15, 2025
- **Next Review**: September 22, 2025
- **Approved By**: UI/UX Designer
- **Status**: Draft v1.0