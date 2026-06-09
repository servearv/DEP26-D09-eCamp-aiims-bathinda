
/**
 * Type definitions for department-specific chief complaints
 */

export interface ChiefComplaint {
  complaint: string;
  side?: 'left' | 'right' | 'both';  // For bilateral organs (ear, eye)
  notes?: string;
}

export interface DentalComplaints {
  complaints: string[];
  affectedTeeth: number[];           // Array of tooth numbers (1-32)
  otherComplaint: string;
}

export interface ENTComplaints {
  ear: {
    complaints: ChiefComplaint[];    // Each can have side: left/right/both
    otherComplaint: string;
  };
  nose: {
    complaints: string[];            // No laterality needed
    otherComplaint: string;
  };
  throat: {
    complaints: string[];
    otherComplaint: string;
  };
}

export interface OphthalmologyComplaints {
  complaints: ChiefComplaint[];      // Each can have side: left/right/both
  otherComplaint: string;
}

export interface DermatologyComplaints {
  complaints: string[];
  otherComplaint: string;
}

// Predefined complaint lists by department
export const DENTAL_COMPLAINTS = [
  'Bleeding gums',
  'Swelling in gum',
  'Tooth sensitivity',
  'Dental caries',
  'Missing tooth',
  'Malalignment',
  'Ulcer',
  'Foul smell',
  'Cleft palate',
] as const;

export const ENT_EAR_COMPLAINTS = [
  'Wax',
  'Ear discharge',
  'Pain',
  'Hearing loss',
  'Perforation',
  'Bulging TM',
] as const;

export const ENT_NOSE_COMPLAINTS = [
  'Visible deformity',
  'Runny nose',
  'Crusting',
  'Bleeding',
  'DNS',
  'Swelling',
  'Injury',
] as const;

export const ENT_THROAT_COMPLAINTS = [
  'Redness',
  'Tonsil enlargement',
  'Swelling',
  'White layer on tongue',
  'Halitosis',
] as const;

export const OPHTHALMOLOGY_COMPLAINTS = [
  'Spectacles',
  'Diminution of vision',
  'Colour blindness',
  'Dryness',
  'Watering',
  'Discharge',
  'Stye',
  'Red eye',
  'Squint',
  'Ptosis',
] as const;

export const DERMATOLOGY_COMPLAINTS = [
  'Dandruff',
  'Itching',
  'Redness',
  'Xerosis',
  'Alopecia',
  'White patch',
  'Rash',
  'Acne',
  'Nail changes',
] as const;
