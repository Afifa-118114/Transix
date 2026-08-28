# ✈️ Transix – AI-Assisted Travel Planner

Transix is a full-stack AI-powered travel planning web application designed to simplify trip planning from a single platform.

It combines AI-generated personalized itineraries with real-world travel information to help users plan trips based on their destination, budget, travel dates, preferences, interests, and travel mode.

---

# 🚀 Live Demo

**Live Application:**  
https://transix-henna.vercel.app/

**GitHub Repository:**  
https://github.com/Afifa-118114/Transix

---

# ✨ Features

## 🔐 Authentication

- User Registration
- Secure Login
- JWT-based Authentication
- Protected Routes
- User-specific trip access

---

## 🤖 AI Trip Planner

Transix allows users to generate personalized multi-day travel plans using AI.

Users can provide:

- Source and Destination
- Travel Dates
- Budget
- Number of Travelers
- Travel Mode
- Hotel Preference
- Food Preference
- Trip Type
- Trip Purpose
- Interests
- Priority

Google Gemini AI generates a personalized itinerary based on the user's requirements and preferences.

---

## 🗓️ AI Itinerary

The generated itinerary provides:

- Trip Summary
- Day-wise itinerary
- Activities
- Estimated timings
- Estimated costs
- Budget breakdown
- Travel tips
- Personalized recommendations

Users can review the complete plan before customizing it through the Trip Builder.

---

## 🧳 Trip Builder

The Trip Builder allows users to review and customize their AI-generated travel plan.

Users can:

- View the complete generated itinerary
- View day-wise activities
- Modify trip information
- Customize itinerary details
- Update budget and traveler information
- Manage itinerary activities
- Regenerate individual itinerary days using AI
- Save updated trip information

The Builder provides flexibility to refine the AI-generated itinerary according to the user's actual preferences.

---

## 💾 Trip Management

Users can manage their generated trips from the application.

Features include:

- Create trips
- View saved trips
- View individual trip details
- Update trip information
- Customize itineraries
- Regenerate individual itinerary days
- Maintain user-specific trip data

---

## 🏨 Hotel Recommendations

Discover hotels based on the selected destination using location-based travel data.

Information can include:

- Hotel name
- Ratings
- Reviews
- Photos
- Address
- Location information
- Google Maps link

---

## 🍴 Food & Dining

Discover nearby food and dining options, including:

- Restaurants
- Cafes
- Fast Food
- Bakeries
- Pizza
- Street Food

---

## 📍 Nearby Essentials

Find useful services around the destination, including:

- Hospitals
- Pharmacies
- ATMs
- Petrol Pumps
- Police Stations
- Mechanics

---

## 🚆 Travel Options

Transix provides travel recommendations based on the selected travel mode and destination.

The application includes travel-related services and train planning functionality supported by the backend.

> Real-time availability, schedules, and pricing may depend on the external travel services and APIs being used.

---

## 🖼️ Secure Image Retrieval

Travel and place images are retrieved through the backend.

Instead of exposing the Pexels API key directly in the browser, the frontend communicates with a backend image endpoint.

This keeps third-party API credentials on the server side.

---

# 🏗️ Application Architecture

```text
                         USER
                           │
                           ▼
                 ┌───────────────────┐
                 │  React Frontend   │
                 │  Vite + Tailwind  │
                 │      Vercel       │
                 └─────────┬─────────┘
                           │
                      REST API / Axios
                           │
                           ▼
                 ┌───────────────────┐
                 │  Express Backend  │
                 │      Node.js      │
                 │      Render       │
                 └─────────┬─────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌───────────────┐       ┌─────────────────┐
       │ MongoDB Atlas │       │ External APIs   │
       │               │       │                 │
       │ Users & Trips │       │ Gemini AI       │
       │               │       │ Google Places   │
       └───────────────┘       │ Pexels          │
                               │ Travel Services │
                               └─────────────────┘


🛠️ Tech Stack

Frontend
React.js
Vite
Tailwind CSS
React Router
Axios
Framer Motion
Lucide React
React Icons
React Hot Toast

Backend
Node.js
Express.js
MongoDB
Mongoose
JWT
bcryptjs
Zod
Axios
AI & APIs
Google Gemini AI
Google Places API
Pexels API
Travel/Transport Data Services


📁 Project Structure
Transix/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── public/
│   ├── vercel.json
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validators/
│   │
│   ├── server.js
│   └── package.json
│
└── README.md


⚙️ Getting Started
1. Clone the Repository
git clone https://github.com/Afifa-118114/Transix.git
cd Transix

2. Backend Setup
cd backend
npm install
npm start

For development:
npm run dev

The backend uses server.js as its application entry point.

3. Frontend Setup

Open another terminal:

cd frontend
npm install
npm run dev

The frontend is powered by Vite.

🔑 Environment Variables
Backend

Create a .env file inside the backend directory.

PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

GOOGLE_MAPS_API_KEY=your_google_maps_api_key

GOOGLE_PLACES_API_KEY=your_google_places_api_key

PEXELS_API_KEY=your_pexels_api_key

FRONTEND_URL=http://localhost:5173
Frontend

Create a .env file inside the frontend directory.

VITE_API_URL=http://localhost:5000/api

For the deployed frontend:

VITE_API_URL=https://transix-backend.onrender.com/api

Never commit actual API keys, passwords, JWT secrets, or MongoDB credentials to GitHub.

🌐 Deployment

Transix uses a separate frontend and backend deployment architecture.

Frontend – Vercel

The React/Vite frontend is deployed on Vercel.


Live Application:

https://transix-henna.vercel.app/

The frontend includes SPA routing configuration to ensure client-side routes work correctly when directly accessed or refreshed.

Backend – Render

The Node.js/Express backend is deployed on Render.

Backend:

https://transix-backend.onrender.com

Health Check:

https://transix-backend.onrender.com/health

The health endpoint is used to verify that the production backend is running correctly.

🔒 Security & Deployment Improvements

Transix includes several security and deployment-focused improvements:

JWT authentication
Protected API routes
User ownership checks
Whitelisted editable trip fields
Zod input validation
Date validation
Itinerary day validation
Mongoose modification tracking
Production-safe error handling
Configured CORS
Environment-based API configuration
Backend-side API key protection
Pexels API proxy through the backend
Production health endpoint
SPA routing support for Vercel

🚀 Deployment Architecture
                         INTERNET
                            │
                            ▼
                  ┌──────────────────┐
                  │      VERCEL      │
                  │ React Frontend   │
                  └────────┬─────────┘
                           │
                           │ HTTPS API Requests
                           ▼
                  ┌──────────────────┐
                  │      RENDER      │
                  │ Express Backend  │
                  └────────┬─────────┘
                           │
                  ┌────────┴─────────┐
                  │                  │
                  ▼                  ▼
           ┌──────────────┐   ┌────────────────┐
           │ MongoDB Atlas│   │ External APIs  │
           │              │   │                │
           │ Users        │   │ Gemini AI      │
           │ Trips        │   │ Google Places  │
           └──────────────┘   │ Pexels         │
                              │ Travel Services│
                              └────────────────┘
