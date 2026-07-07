import trainImg from "../assets/travel/train.jpg";
import flightImg from "../assets/travel/flight.jpg";
import busImg from "../assets/travel/bus.jpg";
import cabImg from "../assets/travel/cab.jpg";

export default function generateTransportData(trip) {
  const mode = trip.travelMode;

  if (mode === "Train") {
    return [
      {
        id: 1,
        name: "Vande Bharat Express",
        operator: "Indian Railways",
        duration: "6h 25m",
        departure: "06:00 AM",
        arrival: "12:25 PM",
        price: "₹1,450",
        rating: 4.8,
        reviews: 12540,
        bookingUrl: "https://www.irctc.co.in/",
        image: trainImg,
        route: ["Source Station", "Intermediate Stop", "Destination Station"],
      },
      {
        id: 2,
        name: "Rajdhani Express",
        operator: "Indian Railways",
        duration: "7h 05m",
        departure: "07:20 AM",
        arrival: "02:25 PM",
        price: "₹1,180",
        rating: 4.7,
        reviews: 9320,
        bookingUrl: "https://www.irctc.co.in/",
        image: trainImg,
        route: ["Source Station", "Major Junction", "Destination Station"],
      },
      {
        id: 3,
        name: "Garib Rath Express",
        operator: "Indian Railways",
        duration: "8h 10m",
        departure: "09:30 AM",
        arrival: "05:40 PM",
        price: "₹890",
        rating: 4.4,
        reviews: 8450,
        bookingUrl: "https://www.irctc.co.in/",
        image: trainImg,
        route: ["Source Station", "City Junction", "Destination Station"],
      },
      {
        id: 4,
        name: "Duronto Express",
        operator: "Indian Railways",
        duration: "6h 55m",
        departure: "10:15 AM",
        arrival: "05:10 PM",
        price: "₹1,320",
        rating: 4.6,
        reviews: 7810,
        bookingUrl: "https://www.irctc.co.in/",
        image: trainImg,
        route: ["Source Station", "Express Halt", "Destination Station"],
      },
    ];
  }

  if (mode === "Flight") {
    return [
      {
        id: 1,
        name: "IndiGo",
        operator: "6E 524",
        duration: "2h 10m",
        departure: "08:30 AM",
        arrival: "10:40 AM",
        price: "₹5,400",
        rating: 4.7,
        reviews: 19450,
        bookingUrl: "https://www.goindigo.in/",
        image: flightImg,
        route: ["Departure Airport", "Arrival Airport"],
      },
      {
        id: 2,
        name: "Air India",
        operator: "AI 216",
        duration: "2h 25m",
        departure: "11:20 AM",
        arrival: "01:45 PM",
        price: "₹5,850",
        rating: 4.6,
        reviews: 15300,
        bookingUrl: "https://www.airindia.com/",
        image: flightImg,
        route: ["Departure Airport", "Arrival Airport"],
      },
      {
        id: 3,
        name: "Akasa Air",
        operator: "QP 1543",
        duration: "2h 15m",
        departure: "02:10 PM",
        arrival: "04:25 PM",
        price: "₹4,980",
        rating: 4.5,
        reviews: 7400,
        bookingUrl: "https://www.akasaair.com/",
        image: flightImg,
        route: ["Departure Airport", "Arrival Airport"],
      },
    ];
  }

  if (mode === "Bus") {
    return [
      {
        id: 1,
        name: "Volvo AC Sleeper",
        operator: "RedBus",
        duration: "10h",
        departure: "09:00 PM",
        arrival: "07:00 AM",
        price: "₹1,250",
        rating: 4.6,
        reviews: 7200,
        bookingUrl: "https://www.redbus.in/",
        image: busImg,
        route: ["Departure", "Destination"],
      },
      {
        id: 2,
        name: "IntrCity SmartBus",
        operator: "IntrCity",
        duration: "9h 40m",
        departure: "08:30 PM",
        arrival: "06:10 AM",
        price: "₹1,050",
        rating: 4.5,
        reviews: 5100,
        bookingUrl: "https://www.intrcity.com/",
        image: busImg,
        route: ["Departure", "Destination"],
      },
      {
        id: 3,
        name: "ZingBus Premium",
        operator: "ZingBus",
        duration: "9h 15m",
        departure: "10:00 PM",
        arrival: "07:15 AM",
        price: "₹980",
        rating: 4.4,
        reviews: 3900,
        bookingUrl: "https://www.zingbus.com/",
        image: busImg,
        route: ["Departure", "Destination"],
      },
    ];
  }

  return [
    {
      id: 1,
      name: "Uber Intercity",
      operator: "Uber",
      duration: "8h",
      departure: "Flexible",
      arrival: "Flexible",
      price: "₹7,200",
      rating: 4.8,
      reviews: 9800,
      bookingUrl: "https://www.uber.com/in/en/",
      image: cabImg,
      route: ["Pickup", "Destination"],
    },
    {
      id: 2,
      name: "Ola Outstation",
      operator: "Ola",
      duration: "8h 20m",
      departure: "Flexible",
      arrival: "Flexible",
      price: "₹6,950",
      rating: 4.6,
      reviews: 8100,
      bookingUrl: "https://www.olacabs.com/",
      image: cabImg,
      route: ["Pickup", "Destination"],
    },
  ];
}
