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
