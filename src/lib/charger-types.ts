export type Phase = "Single" | "Three" | "Both" | "N/A";

export interface BaseCharger {
  id: string;
  brand: string;
  variant: string;
  price: number | null;
  priceDisplay: string | null;
  phase: Phase;
  power: string;
  ratedCurrent: string;
  countryOfManufacture: string;
  dimensions: string;
  weight: string;
  cableLength: string;
  display: string;
  solarSmart?: boolean;
  solarSmartNote?: string;
  internetConnection: boolean;
  appControl: boolean;
  ocppCompatible: boolean;
  loadManagement: boolean;
  multiUser: boolean;
  ipRating: string;
  operatingTemp: string;
  bidirectional: boolean;
  bidirectionalNote?: string;
  warrantyYears: string;
  notes?: string;
  /** Real product photo, verified to match this exact charger. Omit to fall back to the generic placeholder. */
  photoUrl?: string;
  photoCredit?: string;
  /** "cover" for environmental/installation photos that fill the frame, "contain" for isolated product cutouts. Defaults to "cover". */
  photoFit?: "cover" | "contain";
}

export interface ResidentialCharger extends BaseCharger {
  category: "Residential";
  phaseSwitching: boolean;
  chargingModes: string;
}

export interface CommercialCharger extends BaseCharger {
  category: "Commercial";
  chargerType: string;
  suitableApplications: string;
  numberOfPorts: string;
  connectorType: string;
  accessMethod: string;
  paymentOptions: string;
}
