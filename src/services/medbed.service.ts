// MedBed Service Logic
import { getSupabaseClient, createServiceClient } from '../lib/supabase.js';
import { MedBed, MedBedBooking } from '../types/medbed.types.js';

export class MedBedService {
  private supabase = getSupabaseClient();
  private serviceClient = createServiceClient();

  /**
   * Get all active MedBeds
   */
  async getAllMedBeds(): Promise<MedBed[]> {
    const { data, error } = await this.serviceClient
      .from('med_beds')
      .select('*')
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return data as MedBed[];
  }

  /**
   * Get a specific MedBed by ID
   */
  async getMedBedById(id: string): Promise<MedBed | null> {
    const { data, error } = await this.serviceClient
      .from('med_beds')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as MedBed;
  }

  /**
   * Check availability for a specific MedBed
   */
  async checkAvailability(medBedId: string, startTime: string, endTime: string): Promise<boolean> {
    // Check for overlapping bookings
    // (start1 < end2) and (end1 > start2)
    const { data, error } = await this.serviceClient
      .from('med_bed_bookings')
      .select('id')
      .eq('med_bed_id', medBedId)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (error) throw new Error(error.message);

    // If any bookings found, it's not available
    return data.length === 0;
  }

  /**
   * Create a new booking
   */
  async createBooking(
    userId: string,
    medBedId: string,
    startTime: string,
    endTime: string,
    paymentIntentId?: string
  ): Promise<MedBedBooking> {
    // 1. Verify availability first
    const isAvailable = await this.checkAvailability(medBedId, startTime, endTime);
    if (!isAvailable) {
      throw new Error('Selected time slot is not available');
    }

    // 2. Get MedBed details to calculate cost
    const medBed = await this.getMedBedById(medBedId);
    if (!medBed) throw new Error('MedBed not found');

    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const totalAmount = Math.ceil(hours * medBed.hourly_rate);

    // 3. Create booking
    const { data, error } = await this.serviceClient
      .from('med_bed_bookings')
      .insert({
        user_id: userId,
        med_bed_id: medBedId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending', // Pending payment confirmation
        total_amount: totalAmount,
        payment_intent_id: paymentIntentId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Get bookings for a specific user
   */
  async getUserBookings(userId: string): Promise<MedBedBooking[]> {
    const { data, error } = await this.serviceClient
      .from('med_bed_bookings')
      .select('*, med_beds(*)')
      .eq('user_id', userId)
      .order('start_time', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, userId: string): Promise<MedBedBooking> {
    // Verify ownership
    const { data: booking } = await this.serviceClient
      .from('med_bed_bookings')
      .select('user_id')
      .eq('id', bookingId)
      .single();

    if (!booking) throw new Error('Booking not found');
    if (booking.user_id !== userId) throw new Error('Unauthorized');

    const { data, error } = await this.serviceClient
      .from('med_bed_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
