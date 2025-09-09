# 🏏 Auction Pro - Deployment Guide

## 📋 **Project Overview**
**Auction Pro** is a Live Cricket Auction Platform with real-time bidding, AI-powered player recommendations, and comprehensive performance analytics.

### **🚀 Features**
- **Host Features**: Player management, auction room creation, performance scoring
- **Buyer Features**: Fixed ₹120Cr budget, AI recommendations, real-time bidding
- **Real-time**: WebSocket-based live auctions with 5-second timers
- **AI Integration**: Emergent LLM key for intelligent player recommendations
- **Modern UI**: Beautiful responsive design with Tailwind CSS

---

## 📁 **Project Structure**
```
auction-pro/
├── backend/                 # FastAPI Backend
│   ├── server.py           # Main FastAPI application
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Styles
│   │   └── index.js       # Entry point
│   ├── package.json       # Node.js dependencies
│   ├── tailwind.config.js # Tailwind configuration
│   └── public/            # Static assets
└── README.md              # This file
```

---

## 🛠️ **Local Development Setup**

### **Prerequisites**
- Node.js (v18+)
- Python (3.9+)
- MongoDB
- Yarn package manager

### **Backend Setup**
```bash
cd backend/
pip install -r requirements.txt

# Create .env file with:
MONGO_URL="mongodb://localhost:27017"
DB_NAME="auction_pro_db"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=your_llm_key_here

# Run backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### **Frontend Setup**
```bash
cd frontend/
yarn install

# Create .env file with:
REACT_APP_BACKEND_URL=http://localhost:8001

# Run frontend
yarn start
```

---

## 🌐 **Deployment Options**

### **Option 1: Vercel + Railway**
**Frontend (Vercel):**
1. Push code to GitHub
2. Connect to Vercel
3. Deploy frontend from `/frontend` directory
4. Set environment variables in Vercel dashboard

**Backend (Railway):**
1. Connect GitHub repo to Railway
2. Deploy from `/backend` directory
3. Add MongoDB database service
4. Set environment variables

### **Option 2: Netlify + Heroku**
**Frontend (Netlify):**
1. Build: `yarn build`
2. Deploy `build/` folder to Netlify
3. Set environment variables

**Backend (Heroku):**
1. Create `Procfile`: `web: uvicorn server:app --host 0.0.0.0 --port $PORT`
2. Deploy to Heroku
3. Add MongoDB Atlas addon

### **Option 3: Docker Deployment**
```dockerfile
# Backend Dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]

# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build
CMD ["yarn", "start"]
```

---

## 🔧 **Environment Variables**

### **Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=auction_pro_db
CORS_ORIGINS=http://localhost:3000
EMERGENT_LLM_KEY=sk-emergent-47dEe7e53FbD170A38
```

### **Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## 🎯 **Key Features Implementation**

### **Performance Scoring Algorithm**
- **Batting (40%)**: Strike Rate (priority), Average, Centuries, Fifties
- **Bowling (35%)**: Economy Rate (priority), Wickets, Best Figures  
- **Fielding (15%)**: Catches, Run-outs
- **Overall (10%)**: Recent Form, Experience

### **AI Recommendations**
- Uses Emergent LLM integration with GPT-4o-mini
- Analyzes player stats, buyer budget, and preferences
- Returns prioritized player recommendations

### **Real-time Bidding**
- WebSocket connections for live updates
- 5-second countdown timers
- Budget validation and tracking
- Automatic player assignment

---

## 🔒 **Security Notes**
- Add proper authentication in production
- Use environment variables for all secrets
- Enable CORS properly for production domains
- Add rate limiting for API endpoints

---

## 🐛 **Troubleshooting**

### **Common Issues**
1. **CORS Errors**: Update CORS_ORIGINS in backend .env
2. **Database Connection**: Ensure MongoDB is running
3. **WebSocket Issues**: Check firewall and proxy settings
4. **AI Recommendations**: Verify EMERGENT_LLM_KEY is set

### **Logs Location**
- Backend: Check console output or logging configuration
- Frontend: Browser developer console
- Database: MongoDB logs

---

## 📞 **Support**
For deployment assistance or technical support, contact the development team.

---

## 🎉 **Success!**
Your Auction Pro platform should now be running with:
- ✅ Real-time cricket auctions
- ✅ AI-powered recommendations  
- ✅ Fixed ₹120Cr buyer budgets
- ✅ Comprehensive player analytics
- ✅ Beautiful modern UI

**Live Demo**: https://sportsbid.preview.emergentagent.com