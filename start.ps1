# Smart City Management Platform - Development Servers
Write-Host "🏙️ Starting Smart City Management Platform" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Check if MongoDB is running
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if (-not $mongoService -or $mongoService.Status -ne "Running") {
    Write-Host "🔄 Starting MongoDB service..." -ForegroundColor Yellow
    try {
        Start-Service -Name "MongoDB"
        Start-Sleep -Seconds 3
        Write-Host "✅ MongoDB service started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start MongoDB. Please start it manually:" -ForegroundColor Red
        Write-Host "   net start MongoDB" -ForegroundColor Yellow
        exit 1
    }
}

# Check if ports are available
if (Test-Port -Port 5000) {
    Write-Host "⚠️ Port 5000 is already in use" -ForegroundColor Yellow
}

if (Test-Port -Port 3000) {
    Write-Host "⚠️ Port 3000 is already in use" -ForegroundColor Yellow
}

Write-Host "`n🚀 Starting backend server (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Projects\Smart_city\backend'; npm run dev"

Write-Host "⏳ Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🚀 Starting frontend server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'D:\Projects\Smart_city\frontend'; npm start"

Write-Host "`n✅ Both servers are starting!" -ForegroundColor Green
Write-Host "`nURLs will be available shortly:" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "- Health Check: http://localhost:5000/health" -ForegroundColor White

Write-Host "`nDefault Login Credentials:" -ForegroundColor Yellow
Write-Host "- Admin: admin@smartcity.com / admin123" -ForegroundColor White
Write-Host "- Environment Officer: env@smartcity.com / env123" -ForegroundColor White
Write-Host "- Utility Officer: utility@smartcity.com / utility123" -ForegroundColor White
Write-Host "- Traffic Control: traffic@smartcity.com / traffic123" -ForegroundColor White
Write-Host "- Viewer: viewer@smartcity.com / viewer123" -ForegroundColor White

Write-Host "`n💡 Tip: Keep this window open. Close it to stop monitoring." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to exit this script (servers will keep running)" -ForegroundColor Gray

# Keep script running to show status
Write-Host "`n📊 Server Status Monitor (Press Ctrl+C to exit):" -ForegroundColor Yellow
while ($true) {
    Start-Sleep -Seconds 10
    
    $backendStatus = if (Test-Port -Port 5000) { "🟢 Running" } else { "🔴 Stopped" }
    $frontendStatus = if (Test-Port -Port 3000) { "🟢 Running" } else { "🔴 Stopped" }
    
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Backend: $backendStatus | Frontend: $frontendStatus" -ForegroundColor Gray
}