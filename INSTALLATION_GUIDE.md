# Quick Installation Guide for Smart City Platform

## Prerequisites Installation

### 1. Install Node.js
- Go to: https://nodejs.org/
- Download LTS version (recommended)
- Run installer and make sure "Add to PATH" is checked
- Restart PowerShell after installation

### 2. Install MongoDB
- Go to: https://www.mongodb.com/try/download/community
- Download Windows .msi installer
- Choose "Complete" installation
- Install as Windows service

## Quick Start Commands

After installing Node.js and MongoDB, run these commands:

```powershell
# Navigate to project directory
cd "D:\Projects\Smart_city"

# Run automated setup (installs dependencies, configures environment, seeds database)
.\setup.ps1

# Start both servers
.\start.ps1
```

## Manual Setup (Alternative)

If you prefer manual setup:

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ..\frontend
npm install

# Start MongoDB service
net start MongoDB

# Seed database (from backend directory)
cd ..\backend
npm run seed

# Start backend server (Port 5000)
npm run dev

# In new terminal, start frontend (Port 3000)
cd ..\frontend
npm start
```

## Default Login Credentials

- **Admin:** admin@smartcity.com / admin123
- **Environment Officer:** env@smartcity.com / env123
- **Utility Officer:** utility@smartcity.com / utility123
- **Traffic Control:** traffic@smartcity.com / traffic123
- **Viewer:** viewer@smartcity.com / viewer123

## URLs

- **Frontend Dashboard:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/health

## Troubleshooting

If you get "command not found" errors:
1. Make sure Node.js is installed with PATH option checked
2. Restart PowerShell/Command Prompt
3. Run: `refreshenv` (if you have Chocolatey)

If MongoDB doesn't start:
- Run: `net start MongoDB`
- Or check Windows Services and start "MongoDB" service

## Project Features

✅ Real-time dashboard with live data updates
✅ Interactive maps with city infrastructure
✅ Role-based access control (5 user types)
✅ Alert management system
✅ Analytics and reporting
✅ Responsive design for all devices
✅ RESTful API with Socket.io real-time updates