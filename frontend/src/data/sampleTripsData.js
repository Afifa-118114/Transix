/**
 * Transix Curated Sample Journeys
 * Clearly designated sample/demo itineraries to demonstrate platform capabilities.
 * NOTE: Marked explicitly as sample/demo. No fake live bookings or inventory.
 */

export const SAMPLE_TRIPS = [
  {
    id: "kerala-explorer",
    _id: "sample-kerala-explorer",
    isSample: true,
    tag: "Cultural + Nature",
    category: "Cultural + Nature",
    title: "Kerala Explorer",
    subtitle: "Tropical Backwaters, Tea Plantations & Spice Mist",
    destination: "Kerala",
    locationMeta: "Kerala",
    source: "Kochi",
    duration: "7 Days",
    durationDays: 7,
    travelers: 2,
    budget: 42000,
    currency: "₹",
    travelMode: "Train & Private Cab",
    hotelType: "Comfort Heritage",
    heroImage: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80",
    description: "Experience the tranquil backwaters of Alleppey, emerald tea hills of Munnar, and historic spices of Fort Kochi in an end-to-end coordinated flow.",
    highlights: [
      "Sunset shikara cruise along Alleppey backwaters",
      "Kolukkumalai tea estate sunrise drive",
      "Traditional Kathakali cultural evening in Fort Kochi",
      "Locally sourced Malabar culinary trail"
    ],
    staySegments: [
      {
        location: "Munnar",
        nights: 2,
        checkIn: "2026-10-10",
        checkOut: "2026-10-12",
        selectedHotel: {
          name: "Fragrant Nature Munnar (Sample)",
          rating: 4.8,
          pricePerNight: 5500,
          image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Alleppey",
        nights: 2,
        checkIn: "2026-10-12",
        checkOut: "2026-10-14",
        selectedHotel: {
          name: "Lake Canopy Resort (Sample)",
          rating: 4.7,
          pricePerNight: 4800,
          image: "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Fort Kochi",
        nights: 1,
        checkIn: "2026-10-14",
        checkOut: "2026-10-15",
        selectedHotel: {
          name: "Brunton Boatyard (Sample)",
          rating: 4.9,
          pricePerNight: 6200,
          image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"
        }
      }
    ],
    itinerary: [
      {
        day: 1,
        title: "Arrival in Kochi & Scenic Ascent to Munnar",
        plan: [
          {
            time: "09:30 AM",
            activity: "Arrival at Kochi Airport / Station and meet local private transport.",
            type: "transport",
            category: "Transport",
            location: "Kochi International Airport"
          },
          {
            time: "01:00 PM",
            activity: "Stop by Cheeyappara & Valara Waterfalls en route to Munnar hills.",
            type: "sightseeing",
            category: "Nature",
            location: "Cheeyappara Falls"
          },
          {
            time: "04:30 PM",
            activity: "Check-in at Munnar hillside resort & evening valley tea walk.",
            type: "activity",
            category: "Leisure",
            location: "Munnar Valley"
          }
        ]
      },
      {
        day: 2,
        title: "Munnar Tea Trails, Eravikulam & Top Station",
        plan: [
          {
            time: "08:00 AM",
            activity: "Eravikulam National Park guided safari (Nilgiri Tahr habitat).",
            type: "activity",
            category: "Wildlife",
            location: "Eravikulam"
          },
          {
            time: "02:00 PM",
            activity: "Tata Tea Museum & curated factory tea tasting session.",
            type: "activity",
            category: "Culture",
            location: "Tea Museum, Munnar"
          },
          {
            time: "05:00 PM",
            activity: "Sunset vantage point at Mattupetty Dam & Eco Point.",
            type: "sightseeing",
            category: "Nature",
            location: "Mattupetty"
          }
        ]
      },
      {
        day: 3,
        title: "Periyar Spice Ridge & Transfer toward Alleppey",
        plan: [
          {
            time: "09:00 AM",
            activity: "Scenic hill-road transfer with spice plantation aroma stop.",
            type: "transport",
            category: "Transport",
            location: "Idukki Pass"
          },
          {
            time: "01:30 PM",
            activity: "Traditional Kerala Sadhya lunch served on banana leaf.",
            type: "dining",
            category: "Food",
            location: "Kottayam Foothills"
          },
          {
            time: "05:00 PM",
            activity: "Arrival in Alleppey backwater sanctuary and lake sunset.",
            type: "activity",
            category: "Leisure",
            location: "Vembanad Lake"
          }
        ]
      },
      {
        day: 4,
        title: "Backwater Shikara Cruise & Village Heritage",
        plan: [
          {
            time: "07:30 AM",
            activity: "Quiet morning electric shikara ride through narrower canal networks.",
            type: "activity",
            category: "Sightseeing",
            location: "Kuttanad Canals"
          },
          {
            time: "12:00 PM",
            activity: "Visit coir-weaving artisan homesteads & paddy farming below sea-level.",
            type: "sightseeing",
            category: "Culture",
            location: "Champakkulam"
          },
          {
            time: "06:30 PM",
            activity: "Lakeside campfire dinner with fresh coastal spices.",
            type: "dining",
            category: "Dining",
            location: "Alleppey Resort"
          }
        ]
      },
      {
        day: 5,
        title: "Fort Kochi Colonial Streets & Chinese Fishing Nets",
        plan: [
          {
            time: "10:00 AM",
            activity: "Drive to Fort Kochi heritage precinct.",
            type: "transport",
            category: "Transport",
            location: "Fort Kochi"
          },
          {
            time: "03:00 PM",
            activity: "Walking tour of Jew Town, Paradesi Synagogue and Mattancherry Dutch Palace.",
            type: "sightseeing",
            category: "History",
            location: "Jew Town"
          },
          {
            time: "06:00 PM",
            activity: "Chinese fishing nets silhouette photography & Kathakali dance presentation.",
            type: "activity",
            category: "Art",
            location: "Vasco da Gama Square"
          }
        ]
      },
      {
        day: 6,
        title: "Artisan Souvenirs & Departure Coordination",
        plan: [
          {
            time: "09:00 AM",
            activity: "Coffee and cinnamon rolls at heritage café followed by spice market shopping.",
            type: "leisure",
            category: "Shopping",
            location: "Princess Street"
          },
          {
            time: "01:00 PM",
            activity: "Seamless transfer to Cochin International Airport.",
            type: "transport",
            category: "Transport",
            location: "COK Airport"
          }
        ]
      }
    ]
  },
  {
    id: "rajasthan-heritage",
    _id: "sample-rajasthan-heritage",
    isSample: true,
    tag: "Culture + Heritage",
    category: "Culture + Heritage",
    title: "Rajasthan Heritage",
    subtitle: "Royal Citadels, Desert Stars & Havelis",
    destination: "Rajasthan",
    locationMeta: "Jaipur · Jodhpur · Udaipur",
    source: "Jaipur",
    duration: "6 Days",
    durationDays: 6,
    travelers: 2,
    budget: 58000,
    currency: "₹",
    travelMode: "Train & Heritage Taxi",
    hotelType: "Heritage Haveli",
    heroImage: "https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80",
    description: "Walk the pink sandstone corridors of Jaipur, gaze across the blue rooftops of Jodhpur, and sleep under desert skies in Jaisalmer.",
    highlights: [
      "Amer Fort private courtyard heritage tour",
      "Golden hour overlooking Mehrangarh Citadel",
      "Desert glamping & stargazing in Thar Dunes",
      "Curated textile and gemstone artisan workshops"
    ],
    staySegments: [
      {
        location: "Jaipur",
        nights: 2,
        checkIn: "2026-11-05",
        checkOut: "2026-11-07",
        selectedHotel: {
          name: "Samode Haveli Jaipur (Sample)",
          rating: 4.9,
          pricePerNight: 7200,
          image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Jodhpur",
        nights: 2,
        checkIn: "2026-11-07",
        checkOut: "2026-11-09",
        selectedHotel: {
          name: "Ratan Vilas Heritage (Sample)",
          rating: 4.8,
          pricePerNight: 5800,
          image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Jaisalmer",
        nights: 2,
        checkIn: "2026-11-09",
        checkOut: "2026-11-11",
        selectedHotel: {
          name: "Suryagarh Desert Haven (Sample)",
          rating: 4.9,
          pricePerNight: 8500,
          image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80"
        }
      }
    ],
    itinerary: [
      {
        day: 1,
        title: "The Pink City & Hawa Mahal First Glimpse",
        plan: [
          { time: "11:00 AM", activity: "Arrival in Jaipur, check-in to historic Old City haveli.", type: "transport", category: "Arrival" },
          { time: "03:30 PM", activity: "Architectural study of City Palace & Jantar Mantar observatory.", type: "sightseeing", category: "History" },
          { time: "06:30 PM", activity: "Rooftop chai overlooking illuminated facade of Hawa Mahal.", type: "dining", category: "Dining" }
        ]
      },
      {
        day: 2,
        title: "Amer Citadel & Jaigarh Cannon Heights",
        plan: [
          { time: "08:30 AM", activity: "Early morning access to Sheesh Mahal (Mirror Palace) inside Amer Fort.", type: "sightseeing", category: "Heritage" },
          { time: "01:00 PM", activity: "Traditional Rajasthani Thali experience with Dal Baati Churma.", type: "dining", category: "Food" },
          { time: "04:30 PM", activity: "Sunset over the Aravali hills from Nahargarh Fort ramparts.", type: "activity", category: "Sightseeing" }
        ]
      },
      {
        day: 3,
        title: "Express Transit to Jodhpur, the Sun City",
        plan: [
          { time: "08:00 AM", activity: "Comfort intercity train journey to Jodhpur.", type: "transport", category: "Transport" },
          { time: "02:30 PM", activity: "Blue City alley stroll guided by local heritage preservationist.", type: "activity", category: "Walking Tour" },
          { time: "07:00 PM", activity: "Stepwell cafe dinner at Toorji Ka Jhalra.", type: "dining", category: "Dining" }
        ]
      },
      {
        day: 4,
        title: "Mehrangarh Fort Mastery & Jaswant Thada",
        plan: [
          { time: "09:00 AM", activity: "Curated walkthrough of Mehrangarh galleries and royal palanquins.", type: "sightseeing", category: "Culture" },
          { time: "02:00 PM", activity: "Jaswant Thada white marble memorial quiet reflection.", type: "sightseeing", category: "Architecture" },
          { time: "05:00 PM", activity: "Spices and tea tasting in Clock Tower Bazaar.", type: "activity", category: "Shopping" }
        ]
      },
      {
        day: 5,
        title: "Golden City of Jaisalmer & Living Citadel",
        plan: [
          { time: "08:30 AM", activity: "Private SUV route through the desert borderland to Jaisalmer.", type: "transport", category: "Transport" },
          { time: "03:00 PM", activity: "Explore the only inhabited living golden fort in Asia.", type: "sightseeing", category: "Heritage" },
          { time: "06:00 PM", activity: "Patwon Ki Haveli filigree stonework appreciation.", type: "activity", category: "History" }
        ]
      },
      {
        day: 6,
        title: "Sam Sand Dunes & Desert Glamping Stargaze",
        plan: [
          { time: "10:00 AM", activity: "Kuldhara abandoned ghost village historic mystery exploration.", type: "sightseeing", category: "Mystery" },
          { time: "04:00 PM", activity: "Dune safari and camel trek into golden sunset dunes.", type: "activity", category: "Adventure" },
          { time: "08:00 PM", activity: "Manganiyar folk music circle around open desert hearth.", type: "activity", category: "Music & Stars" }
        ]
      },
      {
        day: 7,
        title: "Desert Farewell & Return Flight Connectivity",
        plan: [
          { time: "09:00 AM", activity: "Morning yoga session over dunes and fresh breakfast.", type: "leisure", category: "Wellness" },
          { time: "12:00 PM", activity: "Transfer to Jaisalmer/Jodhpur airport for onward journey.", type: "transport", category: "Departure" }
        ]
      }
    ]
  },
  {
    id: "goa-escape",
    _id: "sample-goa-escape",
    isSample: true,
    tag: "Relaxation + Local Experiences",
    category: "Relaxation + Local Experiences",
    title: "Goa Escape",
    subtitle: "Sun-drenched Shores, Portuguese Quarters & Seafood",
    destination: "Goa",
    locationMeta: "Goa",
    source: "Mumbai",
    duration: "4 Days",
    durationDays: 4,
    travelers: 4,
    budget: 36000,
    currency: "₹",
    travelMode: "Flight & Rental Vehicles",
    hotelType: "Boutique Coastal Villa",
    heroImage: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80",
    description: "Beyond the beaches: cycle through Fontainhas Latin Quarter, dine in restored spice villas, and catch secluded Mandovi river sunsets.",
    highlights: [
      "Fontainhas heritage architecture photo walk",
      "Catamaran sunset sail along Chapora estuary",
      "Authentic Saraswat and Goan-Portuguese tasting table",
      "Quiet south coast cliff-jumping & kayaking"
    ],
    staySegments: [
      {
        location: "North Goa (Assagao)",
        nights: 2,
        checkIn: "2026-10-18",
        checkOut: "2026-10-20",
        selectedHotel: {
          name: "Villa Blanche Boutique (Sample)",
          rating: 4.8,
          pricePerNight: 5200,
          image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "South Goa (Palolem)",
        nights: 2,
        checkIn: "2026-10-20",
        checkOut: "2026-10-22",
        selectedHotel: {
          name: "The Postcard Hideaway (Sample)",
          rating: 4.9,
          pricePerNight: 6800,
          image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=80"
        }
      }
    ],
    itinerary: [
      {
        day: 1,
        title: "Touchdown & Assagao's Culinary Lanes",
        plan: [
          { time: "11:00 AM", activity: "Mopa Airport arrival & private villa check-in.", type: "transport", category: "Arrival" },
          { time: "03:30 PM", activity: "Artisan boutiques and coffee courtyards in Assagao.", type: "leisure", category: "Culture" },
          { time: "07:00 PM", activity: "Coastal wood-fired dinner under banyan canopies.", type: "dining", category: "Dining" }
        ]
      },
      {
        day: 2,
        title: "Fontainhas Latin Quarter & Mandovi River Sail",
        plan: [
          { time: "09:00 AM", activity: "Guided walking tour through pastel azulejo tiles of Panaji.", type: "sightseeing", category: "Heritage" },
          { time: "01:30 PM", activity: "Poi sandwich & pork vindaloo at 100-year-old bakery.", type: "dining", category: "Food" },
          { time: "05:00 PM", activity: "Catamaran sunset sail along Chapora estuary.", type: "activity", category: "Sailing" }
        ]
      },
      {
        day: 3,
        title: "Transition to Serene South Goa & Spice Farm",
        plan: [
          { time: "10:00 AM", activity: "Scenic southern drive with heritage spice plantation tour.", type: "transport", category: "Nature" },
          { time: "02:30 PM", activity: "Arrival at secluded Palolem coastal sanctuary.", type: "leisure", category: "Check-in" },
          { time: "05:30 PM", activity: "Cabo de Rama fort cliff walk overlooking endless Arabian Sea.", type: "sightseeing", category: "Scenery" }
        ]
      },
      {
        day: 4,
        title: "Butterfly Beach Kayak & Silent Bay Relaxation",
        plan: [
          { time: "07:30 AM", activity: "Early morning sea kayaking to secluded Butterfly cove.", type: "activity", category: "Adventure" },
          { time: "01:00 PM", activity: "Fresh catch grilled fish lunch at beachfront shacks.", type: "dining", category: "Seafood" },
          { time: "05:00 PM", activity: "Sunset paddleboarding in calm Agonda waters.", type: "activity", category: "Water Sports" }
        ]
      }
    ]
  },
  {
    id: "kashmir-journey",
    _id: "sample-kashmir-journey",
    isSample: true,
    tag: "Nature + Adventure",
    category: "Nature + Adventure",
    title: "Kashmir Journey",
    subtitle: "Dal Lake Shikaras, Meadow Pines & Snow Peaks",
    destination: "Kashmir",
    locationMeta: "Srinagar · Gulmarg · Pahalgam",
    source: "Delhi",
    duration: "7 Days",
    durationDays: 7,
    travelers: 2,
    budget: 64000,
    currency: "₹",
    travelMode: "Flight & Alpine Cruiser",
    hotelType: "Luxury Houseboat & Pine Chalet",
    heroImage: "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80",
    description: "Awaken to the sound of ripples against cedar wood on Dal Lake, ride the Gulmarg gondola above the clouds, and breathe the saffron air of Pahalgam.",
    highlights: [
      "Traditional cedarwood luxury houseboat stay on Nigeen Lake",
      "Gulmarg Gondola Phase 2 ascent to Apharwat Peak",
      "Pony trek across Betaab Valley and Aru alpine meadows",
      "Old Srinagar artisan copper and Pashmina weaving studio visits"
    ],
    staySegments: [
      {
        location: "Srinagar (Nigeen Lake)",
        nights: 2,
        checkIn: "2026-10-01",
        checkOut: "2026-10-03",
        selectedHotel: {
          name: "Mascot Houseboats Luxury (Sample)",
          rating: 4.9,
          pricePerNight: 7500,
          image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Gulmarg",
        nights: 1,
        checkIn: "2026-10-03",
        checkOut: "2026-10-04",
        selectedHotel: {
          name: "The Khyber Himalayan Resort (Sample)",
          rating: 5.0,
          pricePerNight: 12000,
          image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80"
        }
      },
      {
        location: "Pahalgam",
        nights: 2,
        checkIn: "2026-10-04",
        checkOut: "2026-10-06",
        selectedHotel: {
          name: "Pahalgam Pine Villa (Sample)",
          rating: 4.8,
          pricePerNight: 6500,
          image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80"
        }
      }
    ],
    itinerary: [
      {
        day: 1,
        title: "Srinagar Arrival, Kahwa Greeting & Floating Market",
        plan: [
          { time: "10:30 AM", activity: "Srinagar airport welcome and private transfer to Nigeen Lake.", type: "transport", category: "Arrival" },
          { time: "02:00 PM", activity: "Steaming cup of saffron Kahwa & traditional walnut cookie welcome.", type: "dining", category: "Welcome" },
          { time: "05:00 PM", activity: "Quiet sunset shikara row past floating gardens and lotus beds.", type: "activity", category: "Boat Cruise" }
        ]
      },
      {
        day: 2,
        title: "Mughal Terraced Gardens & Old Town Craftsmen",
        plan: [
          { time: "09:00 AM", activity: "Stroll through royal fountains of Nishat and Shalimar Bagh.", type: "sightseeing", category: "Garden" },
          { time: "01:00 PM", activity: "Authentic multi-course Kashmiri Wazwan feast.", type: "dining", category: "Wazwan" },
          { time: "03:30 PM", activity: "Artisan workshop: handmade silk carpet knotting and papier-mâché.", type: "activity", category: "Craft" }
        ]
      },
      {
        day: 3,
        title: "Ascent to Gulmarg: Meadow of Flowers & Gondola",
        plan: [
          { time: "08:30 AM", activity: "Panoramic hill drive through Tangmarg pine slopes to Gulmarg.", type: "transport", category: "Mountain Drive" },
          { time: "11:30 AM", activity: "Gondola Phase 2 ascent to Apharwat snow ridge (13,780 ft).", type: "activity", category: "Alpine" },
          { time: "05:00 PM", activity: "Evening fireside relaxation overlooking snow-capped Pir Panjal.", type: "leisure", category: "Chalet" }
        ]
      },
      {
        day: 4,
        title: "Journey to Pahalgam & Saffron Pampore Valleys",
        plan: [
          { time: "08:30 AM", activity: "Descent toward Lidder river valley, pausing at Pampore saffron fields.", type: "transport", category: "Scenic Ride" },
          { time: "02:00 PM", activity: "Pahalgam riverbank stroll listening to crystal Lidder waters.", type: "leisure", category: "Nature" },
          { time: "06:00 PM", activity: "Evening trout tasting at traditional alpine restaurant.", type: "dining", category: "Dinner" }
        ]
      },
      {
        day: 5,
        title: "Betaab Valley & Aru Pine Expedition",
        plan: [
          { time: "09:00 AM", activity: "Explore the dramatic backdrop of Betaab Valley and Chandanwari.", type: "sightseeing", category: "Valley" },
          { time: "02:00 PM", activity: "Scenic pony expedition into high-altitude Aru meadow.", type: "activity", category: "Trek" },
          { time: "06:30 PM", activity: "Final night bonfire under pine canopy and starry mountain sky.", type: "leisure", category: "Bonfire" }
        ]
      },
      {
        day: 6,
        title: "Warm Farewell & Airport Departure",
        plan: [
          { time: "09:00 AM", activity: "Fresh Kashmiri bread (Lavoir) breakfast with mountain honey.", type: "dining", category: "Breakfast" },
          { time: "11:00 AM", activity: "Comfort vehicle transfer back to Srinagar airport with memories packed.", type: "transport", category: "Departure" }
        ]
      }
    ]
  }
];

export default SAMPLE_TRIPS;
