# Transix – AI Assisted Travel Planner

Transix is a full-stack AI-powered travel planning web application that helps users generate personalized trip itineraries while discovering hotels, restaurants, nearby essentials, and travel information through a clean and interactive dashboard.

The project combines AI-generated itineraries with authentic real-world travel data to simplify end-to-end trip planning from a single platform.

---

# Current Features

## Authentication

- User Registration
- Secure Login
- JWT Authentication
- Protected Routes

## AI Trip Planner

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

Gemini AI generates a complete multi-day itinerary based on the provided preferences.

## AI Itinerary Dashboard

Displays:

- Trip Summary
- Day-wise itinerary
- Activities
- Estimated timings
- Estimated costs
- Budget breakdown
- Travel tips

## Hotel Recommendations

- Hotels using Google Places API
- Hotel Details
- Ratings
- Reviews
- Photos
- Address
- Google Maps Link

## Food & Dining

Browse nearby:

- Restaurants
- Cafes
- Fast Food
- Bakeries
- Pizza
- Street Food

## Nearby Essentials

Browse nearby:

- Hospitals
- Pharmacies
- ATMs
- Petrol Pumps
- Police Stations
- Mechanics

## Travel Options

Provides travel recommendations for different transport modes.

> **Currently under development. Real-time Train, Bus and Flight APIs are being integrated.**

## Map View

Displays the route between source and destination on Google Maps.

---

# Tech Stack

## Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Axios

## Backend

- Node.js
- Express.js
- MongoDB
- JWT Authentication

## APIs & Services

- Google Gemini AI
- Google Places API
- Google Maps API

---

# Project Structure

```text
Transix
│
├── frontend
├── backend
├── Screenshots
└── README.md
```

---

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

---

# Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=


JWT_SECRET=

GEMINI_API_KEY=

GOOGLE_MAPS_API_KEY=
```

---

# Currently Working On

- Accurate Budget Breakdown
- Trip Summary & Export
- Real-time Travel APIs
- Saved Trips
- Interactive Route Map
- AI Itinerary Improvements

---

# Project Goal

Transix aims to become an intelligent travel planning platform that combines AI-generated itineraries with authentic real-world travel information, enabling users to plan complete trips from a single application.

---

# Developer

**Afifa Khan**

Computer Engineering Student

Built with **React, Node.js, Express.js, MongoDB, Google Gemini AI and Google Maps Platform.**
