/**
 * Interfaces for Nodes and Edges as requested
 */
export interface HeritageNode {
  id: string;
  label: string;
  region: "Northern" | "Central" | "Southern";
  coordinates: { x: number; y: number }; // Percentage coordinates on canvas (0-100)
  status: "unlocked" | "collectible" | "locked";
  heritageItem: string;
  itemPrice: string;
  itemImage: string;
  description: string;
  funFact: string;
}

export interface HeritageEdge {
  id: string;
  source: string; // HeritageNode ID
  target: string; // HeritageNode ID
  label: string; // e.g. "Eco-Express Train", "Coastal Route"
  distanceKm: number;
  status: "active" | "locked";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  audioUrl?: string;
}

export type ActiveScreen = "home" | "collections" | "passport" | "assistant" | "contact" | "auth" | "profile";
export type ViewMode = "desktop" | "mobile";

export interface BrandTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamilyHeading: string;
  fontFamilyBody: string;
}
