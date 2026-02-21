export interface MedBed {
  id: string;
  name: string;
  type: 'medbed' | 'chamber';
  description: string | null;
  hourly_rate: number;
  image_url: string | null;
  is_active: boolean;
  facility_id?: string | null; // Added from recent migrations
  created_at: string;
  updated_at: string;
}

export interface MedBedBooking {
  id: string;
  user_id: string;
  med_bed_id: string | null;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
  med_beds?: MedBed; // For join queries
}
