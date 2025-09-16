# Smart City Management Platform Setup Script
# Run this script after installing Node.js and MongoDB

Write-Host "🏙️ Smart City Management Platform Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm is installed: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not available" -ForegroundColor Red
    exit 1
}

# Check if MongoDB service is running
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "✅ MongoDB service is running" -ForegroundColor Green
} else {
    Write-Host "⚠️ MongoDB service is not running. Starting MongoDB..." -ForegroundColor Yellow
    try {
        Start-Service -Name "MongoDB"
        Write-Host "✅ MongoDB service started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start MongoDB. Please install MongoDB from https://www.mongodb.com/try/download/community" -ForegroundColor Red
        Write-Host "   Or start it manually with: net start MongoDB" -ForegroundColor Yellow
    }
}

Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ..\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n⚙️ Setting up environment variables..." -ForegroundColor Yellow
Set-Location ..\backend

# Create .env file if it doesn't exist
if (-not (Test-Path ".env")) {
    $envContent = @"
# Database
MONGODB_URI=mongodb://127.0.0.1:27017/smart_city
NODE_ENV=development

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production_$(Get-Random)
JWT_EXPIRE=7d

# Email Configuration (SendGrid) - Optional
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=noreply@smartcity.com
FROM_NAME=Smart City Management

# SMS Configuration (Twilio) - Optional
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Port
PORT=5000

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here_change_in_production_$(Get-Random)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Backend .env file created" -ForegroundColor Green
}

# Create frontend .env file
Set-Location ..\frontend
if (-not (Test-Path ".env")) {
    $frontendEnvContent = @"
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_ENV=development
GENERATE_SOURCEMAP=false
"@
    
    $frontendEnvContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "✅ Frontend .env file created" -ForegroundColor Green
}

Write-Host "`n🌱 Seeding database with sample data..." -ForegroundColor Yellow
Set-Location ..\backend
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Database seeding failed. Make sure MongoDB is running." -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 Setup completed successfully!" -ForegroundColor Green
Write-Host "`nTo start the development servers:" -ForegroundColor Cyan
Write-Host "1. Backend:  cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Frontend: cd frontend && npm start" -ForegroundColor White
Write-Host "`nOr use the start script: .\start.ps1" -ForegroundColor Cyan

Write-Host "`nDefault user accounts:" -ForegroundColor Yellow
Write-Host "- Admin: admin@smartcity.com / admin123" -ForegroundColor White
Write-Host "- Env Officer: env@smartcity.com / env123" -ForegroundColor White
Write-Host "- Utility Officer: utility@smartcity.com / utility123" -ForegroundColor White
Write-Host "- Traffic Control: traffic@smartcity.com / traffic123" -ForegroundColor White
Write-Host "- Viewer: viewer@smartcity.com / viewer123" -ForegroundColor White

Write-Host "`nURLs:" -ForegroundColor Yellow
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "- Health Check: http://localhost:5000/health" -ForegroundColor White

Set-Location ..