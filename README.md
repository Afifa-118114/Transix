# Transix – AI Assisted Travel Planner

Transix is a full-stack travel planning web application that helps users generate personalized trip itineraries using AI while discovering hotels, food places, nearby essentials, and travel information in a clean, interactive dashboard.

The project combines AI-generated itineraries with real location data to simplify travel planning from a single platform.

## ✨ Current Features

### Authentication

- User Registration
- Secure Login
- JWT Authentication
- Protected Routes

### AI Trip Planner

Users can generate personalized trips by providing:

- Source & Destination
- Travel Dates
- Budget
- Number of Travelers
- Travel Mode
- Hotel Preference
- Food Preference
- Trip Type
- Purpose
- Interests

Gemini AI generates a multi-day itinerary based on the provided preferences.

### AI Itinerary Dashboard

Displays:

- Trip Summary
- Day-wise itinerary
- Activities
- Estimated timings
- Estimated costs
- Budget breakdown
- Travel tips

### Hotel Recommendations

- Hotel recommendations using Google Places API
- Hotel details page
- Ratings
- Reviews
- Photos
- Address
- Google Maps link

### 🍽 Food & Dining

Browse nearby:

- Restaurants
- Cafes
- Fast Food
- Bakeries
- Pizza
- Street Food

Each category displays real places using Google Places API.

### Essentials Nearby

Browse nearby:

- Hospitals
- Pharmacies
- ATMs
- Petrol Pumps
- Police Stations
- Mechanics

Data is fetched dynamically based on the selected destination.

### Travel Options

Provides travel recommendations for different transport modes.

_(Currently under active development. Real-time transport APIs are being integrated.)_

### Map View

Displays the route between source and destination on Google Maps.

## Tech Stack

### Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Axios

### Backend

- Node.js
- Express.js
- MongoDB
- JWT Authentication

### APIs & Services

- Google Gemini AI
- Google Places API
- Google Maps API

---

# 📁 Project Structure

```
Transix
│
├── frontend
│
├── backend
│
└── README.md
```

# Getting Started

## Backend

```bash
cd backend
npm install
npm start
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

# 🔑 Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=

MONGO_URI=

JWT_SECRET=

GEMINI_API_KEY=

GOOGLE_MAPS_API_KEY=
```

# 🚧 Currently Working On

The following features are under development:

- Real-time Train API integration
- Flight & Bus travel APIs
- Improved Local Experiences
- Interactive route visualization
- Saved Trips
- Export itinerary (PDF/Image)
- AI itinerary regeneration improvements

# 📌 Project Goal

The goal of Transix is to build an intelligent travel planning platform that combines AI-generated itineraries with authentic real-world travel information to help users plan complete trips from a single application.

---

# Developer

**Afifa Khan**

Computer Engineering Student

Built using React, Node.js, MongoDB, Google Gemini AI and Google Maps Platform.
