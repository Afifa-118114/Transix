const { z } = require("zod");

const isValidDate = (val) => {
  if (typeof val !== "string" || !val.trim()) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
};

const tripSchema = z
  .object({
    source: z.string().trim().min(1, "Source is required"),
    destination: z.string().trim().min(1, "Destination is required"),

    startDate: z
      .string()
      .refine(isValidDate, { message: "Valid start date is required" }),
    endDate: z
      .string()
      .refine(isValidDate, { message: "Valid end date is required" }),

    travelers: z.number().int().min(1, "Travelers must be at least 1"),

    budget: z.number().min(0, "Budget must be a non-negative number"),

    currency: z.string().optional(),

    travelMode: z.enum(["Flight", "Train", "Bus", "Car"]),

    hotelType: z.enum(["Budget", "Standard", "Luxury"]),

    foodPreference: z.enum(["Veg", "Non-Veg", "Vegan", "Any"]).optional(),

    tripType: z.enum(["Solo", "Family", "Friends", "Couple", "Business"]),

    interests: z.array(z.string()).min(1, "At least one interest is required"),

    priority: z.string().min(1, "Priority is required"),

    purpose: z.string().min(1, "Purpose is required"),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end.getTime() >= start.getTime();
    },
    {
      message: "End date cannot be before start date",
      path: ["endDate"],
    },
  );

module.exports = tripSchema;

