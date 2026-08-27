const { z } = require("zod");

const tripSchema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),

  startDate: z.string().min(1),
  endDate: z.string().min(1),

  travelers: z.number().min(1),

  budget: z.number().min(0),

  currency: z.string().optional(),

  travelMode: z.enum(["Flight", "Train", "Bus", "Car"]),

  hotelType: z.enum(["Budget", "Standard", "Luxury"]),

  foodPreference: z.enum(["Veg", "Non-Veg", "Vegan", "Any"]).optional(),

  tripType: z.enum(["Solo", "Family", "Friends", "Couple", "Business"]),

  interests: z.array(z.string()).min(1),

  priority: z.string().min(1),

  purpose: z.string().min(1),
});

module.exports = tripSchema;
