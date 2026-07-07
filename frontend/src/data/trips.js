const trips = {
  "mumbai-delhi": {
    id: 1,

    source: "Mumbai",
    destination: "Delhi",

    startDate: "12 Aug",
    endDate: "17 Aug",

    duration: "5 Days",

    budget: "14200",

    distance: "1420 km",

    travelMode: "Train",

    travelStyle: "Local Explorer",

    heroImage:
      "https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=1200",

    weather: {
      source: "29°C",
      destination: "31°C",
    },

    travelOptions: [
      {
        id: 1,
        type: "Train",
        company: "Rajdhani Express",
        duration: "16h 30m",
        departure: "06:15",
        arrival: "22:45",
        price: 1450,
        rating: 4.9,
        tag: "Best Match",
        recommended: true,
      },

      {
        id: 2,
        type: "Flight",
        company: "IndiGo",
        duration: "2h 10m",
        departure: "09:30",
        arrival: "11:40",
        price: 4500,
        rating: 4.7,
        tag: "Fastest",
        recommended: false,
      },

      {
        id: 3,
        type: "Bus",
        company: "Volvo AC",
        duration: "20h 15m",
        departure: "05:30",
        arrival: "01:45",
        price: 1800,
        rating: 4.4,
        tag: "Budget",
        recommended: false,
      },
    ],

    // ---------------- AI ITINERARY ----------------
    itinerary: [
      {
        id: 1,
        day: "Day 1",
        title: "Travel & Marine Drive",
        image:
          "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800",
      },

      {
        id: 2,
        day: "Day 2",
        title: "India Gate",
        image:
          "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800",
      },

      {
        id: 3,
        day: "Day 3",
        title: "Red Fort",
        image:
          "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=800",
      },

      {
        id: 4,
        day: "Day 4",
        title: "Chandni Chowk",
        image:
          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800",
      },

      {
        id: 5,
        day: "Day 5",
        title: "Lotus Temple",
        image:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800",
      },
    ],

    // ---------------- MAP ----------------
    map: {
      source: {
        city: "Mumbai",
        lat: 19.076,
        lng: 72.8777,
      },

      destination: {
        city: "Delhi",
        lat: 28.6139,
        lng: 77.209,
      },
    },

    // ---------------- HOTELS ----------------
    hotels: [
      {
        id: 1,
        name: "The Imperial",
        location: "Connaught Place",
        price: 5200,
        rating: 4.8,
        image:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      },

      {
        id: 2,
        name: "Bloomrooms",
        location: "New Delhi",
        price: 2400,
        rating: 4.6,
        image:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
      },

      {
        id: 3,
        name: "Taj Palace",
        location: "Chanakyapuri",
        price: 8400,
        rating: 4.9,
        image:
          "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800",
      },

      {
        id: 4,
        name: "The Park",
        location: "Connaught Place",
        price: 4600,
        rating: 4.7,
        image:
          "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800",
      },
    ],

    // ---------------- EXPERIENCES ----------------
    experiences: [
      {
        id: 1,
        title: "Street Food Tour",
        place: "Chandni Chowk",
        rating: 4.9,
        image:
          "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        category: "Food",
      },
      {
        id: 2,
        title: "Heritage Walk",
        place: "Old Delhi",
        rating: 4.8,
        image:
          "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800",
        category: "History",
      },
      {
        id: 3,
        title: "Janpath Market",
        place: "Janpath",
        rating: 4.7,
        image:
          "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800",
        category: "Shopping",
      },
      {
        id: 4,
        title: "Sunset Café",
        place: "Connaught Place",
        rating: 4.6,
        image:
          "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=800",
        category: "Cafe",
      },
    ],

    // ---------------- ESSENTIALS ----------------
    essentials: [
      {
        id: 1,
        title: "Hospital",
        nearest: "Apollo Hospital",
        icon: "hospital",
        distance: "0.8 km",
      },
      {
        id: 2,
        title: "ATM",
        nearest: "HDFC Bank ATM",
        icon: "atm",
        distance: "0.3 km",
      },
      {
        id: 3,
        title: "Fuel",
        nearest: "Indian Oil",
        icon: "fuel",
        distance: "1.2 km",
      },
      {
        id: 4,
        title: "Pharmacy",
        nearest: "Apollo Pharmacy",
        icon: "pharmacy",
        distance: "0.5 km",
      },
      {
        id: 5,
        title: "Police",
        nearest: "Connaught Place Police Station",
        icon: "police",
        distance: "1.0 km",
      },
      {
        id: 6,
        title: "Metro",
        nearest: "Rajiv Chowk Metro",
        icon: "metro",
        distance: "0.4 km",
      },
    ],

    // ---------------- AI ASSISTANT ----------------
    assistant: {
      greeting: "Hello Afifa 👋",
      placeholder: "Ask me anything about your trip...",
    },

    // ---------------- REVIEWS ----------------
    reviews: [
      {
        id: 1,
        user: "Rahul",
        rating: 5,
        comment: "Amazing itinerary generated!",
      },
    ],
  },
};

export default trips;
