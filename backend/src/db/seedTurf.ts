import { db } from "./index";
import { turfDistricts } from "./schema";
import { eq } from "drizzle-orm";

// Upsert 5 turf districts
const districts = [
  {
    name: "Warehouse District",
    description: "Industrial waterfront. Prime territory for smuggling operations.",
    claimCost: 25000,
    crimeBonus: 3,
    pvpBonus: 5,
    incomeBonus: 2,
  },
  {
    name: "Downtown Financial",
    description: "The city's economic heart. Status and influence flow from here.",
    claimCost: 100000,
    crimeBonus: 5,
    pvpBonus: 8,
    incomeBonus: 5,
  },
  {
    name: "Industrial Sector",
    description: "Factories and warehouses. Controls the flow of goods.",
    claimCost: 300000,
    crimeBonus: 8,
    pvpBonus: 5,
    incomeBonus: 10,
  },
  {
    name: "Docklands",
    description: "The port. Everything comes through here — legal or not.",
    claimCost: 600000,
    crimeBonus: 10,
    pvpBonus: 12,
    incomeBonus: 8,
  },
  {
    name: "Suburbs",
    description: "Affordable housing and quiet streets. Perfect for distribution networks.",
    claimCost: 1000000,
    crimeBonus: 15,
    pvpBonus: 15,
    incomeBonus: 15,
  },
];

for (const district of districts) {
  const existing = db.select().from(turfDistricts).where(eq(turfDistricts.name, district.name)).all()[0];
  if (existing) {
    db.update(turfDistricts).set(district).where(eq(turfDistricts.id, existing.id)).run();
  } else {
    db.insert(turfDistricts).values(district).run();
  }
}

console.log("Turf districts seeded successfully!");
