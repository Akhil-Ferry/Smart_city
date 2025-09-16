#!/bin/bash
# filepath: d:\Projects\Smart_city\setup.sh

echo "🏙️ Smart City Management Platform Setup"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16+ first."
    exit 1
fi

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️ MongoDB is not running. Please start MongoDB first."
    echo "   - Install MongoDB: https://docs.mongodb.com/manual/installation/"
    echo "   - Start MongoDB: mongod"
fi

echo "📦 Installing backend dependencies..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Backend dependency installation failed"
    exit 1
fi

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "❌ Frontend dependency installation failed"
    exit 1
fi

echo "⚙️ Setting up environment variables..."
cd ../backend
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Backend .env file created. Please edit it with your configuration."
fi

cd ../frontend
if [ ! -f .env ]; then
    echo "REACT_APP_API_URL=http://localhost:5000" > .env
    echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env
    echo "REACT_APP_ENV=development" >> .env
    echo "✅ Frontend .env file created."
fi

echo "🌱 Seeding database with sample data..."
cd ../backend
npm run seed
if [ $? -ne 0 ]; then
    echo "❌ Database seeding failed. Make sure MongoDB is running."
    exit 1
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "To start the development servers:"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "Default user accounts:"
echo "- Admin: admin@smartcity.com / admin123"
echo "- Env Officer: env@smartcity.com / env123"
echo "- Utility Officer: utility@smartcity.com / utility123"
echo "- Traffic Control: traffic@smartcity.com / traffic123"
echo "- Viewer: viewer@smartcity.com / viewer123"
echo ""
echo "URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
echo "- Health Check: http://localhost:5000/health"