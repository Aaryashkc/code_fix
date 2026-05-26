// ============ DESTINATION TYPES ============
export type DestinationCategory = "Religious" | "Nature" | "Adventure" | "Cultural" | "Urban"

export interface Destination {
  id: string
  _id?: string
  name: string
  slug: string
  category: DestinationCategory
  region: "Eastern" | "Central" | "Western" | "Far-Western"
  description: string
  shortDescription: string
  images: string[]
  rating: number
  reviewCount: number
  priceRange: "Rs" | "Rs Rs" | "Rs Rs Rs"
  bestSeason: string
  duration: string
  difficulty: "Easy" | "Moderate" | "Challenging" | "Expert"
  location: {
    coordinates: [number, number]
    address: string
  }
  features: string[]
  nearbyAttractions: string[]
}

// ============ GUIDE TYPES ============
export interface Guide {
  id: string
  name: string
  slug: string
  avatar: string
  coverImage: string
  location: string
  memberSince: string
  rating: number
  reviewCount: number
  totalTrips: number
  experience: string
  successRate: number
  responseTime: string
  languages: { code: string; name: string }[]
  specializations: string[]
  certifications: string[]
  bio: string
  pricePerDay: number
  available: boolean
  offerings: string[]
}

// ============ REVIEW TYPES ============
export interface Review {
  id: string
  userId: string
  userName: string
  userAvatar: string
  userCountry: string
  rating: number
  categoryRatings: {
    professionalism: number
    communication: number
    knowledge: number
    value: number
  }
  tripType: string
  date: string
  text: string
  photos: string[]
  helpful: number
  guideResponse?: string
}

// ============ NEGOTIATION TYPES ============
export interface NegotiationEntry {
  price: number
  by: "tourist" | "guide"
  message?: string
  at: string
}

// ============ BOOKING TYPES ============
export type BookingStatus = "pending" | "negotiating" | "confirmed" | "declined" | "completed" | "cancelled" | "expired"

export interface BookingRequest {
  id: string
  _id?: string
  touristName: string
  touristAvatar: string
  touristCountry: string
  guideId: string
  guideName: string
  dates: { start: string; end: string }
  destinations: string[]
  packageType: "Half Day Tour" | "Full Day Adventure" | "Multi-Day Expedition"
  addOns: string[]
  groupSize: number
  specialRequirements: string
  offeredPrice: number
  counterPrice?: number
  agreedPrice?: number
  totalPrice: number
  negotiationHistory: NegotiationEntry[]
  status: BookingStatus
  expiresAt?: string
  createdAt: string
}

// ============ USER / TOURIST TYPES ============
export type TravelCategory = "Religious" | "Nature" | "Adventure" | "Cultural" | "Urban"
export type BudgetLevel = "Budget" | "Mid-range" | "Luxury"
export type FitnessLevel = "Low" | "Medium" | "High"
export type TravelStyle = "Solo" | "Group" | "Family"

export interface TouristProfile {
  id: string
  name: string
  email: string
  avatar: string
  country: string
  phone: string
  emergencyContact: { name: string; phone: string }
  preferences: {
    categories: TravelCategory[]
    budget: BudgetLevel
    fitness: FitnessLevel
    travelStyle: TravelStyle
    duration: string
  }
  stats: {
    placesVisited: number
    pinsCreated: number
    upcomingTrips: number
  }
}

// ============ MAP PIN TYPES ============
export type PinCategory = "Religious" | "Nature" | "Adventure" | "Cultural"
export type PinVisibility = "private" | "public"

export interface MapPin {
  id: string
  title: string
  category: PinCategory
  rating: number
  description: string
  photos: string[]
  dateVisited: string
  tags: string[]
  visibility: PinVisibility
  latitude: number
  longitude: number
  userId: string
}
