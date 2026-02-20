import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';

interface Facility {
  id: string;
  name: string;
  type: 'medbed' | 'chamber';
  description: string;
  hourly_rate: number;
  image_url: string;
}

export function MedBedBooking() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [facilities] = useState<Facility[]>([
    {
      id: 'mb-001',
      name: 'Quantum MedBed Unit Alpha',
      type: 'medbed',
      description: 'Full-body quantum regeneration session. Ideal for general wellness and energy rebalancing.',
      hourly_rate: 15000, // $150.00
      image_url: 'https://placehold.co/600x400?text=Quantum+MedBed',
    },
    {
      id: 'ch-001',
      name: 'Hyperbaric Chamber Delta',
      type: 'chamber',
      description: 'High-pressure oxygen therapy chamber for deep tissue healing and recovery.',
      hourly_rate: 12000, // $120.00
      image_url: 'https://placehold.co/600x400?text=Hyperbaric+Chamber',
    },
    {
      id: 'mb-002',
      name: 'Holographic MedBed Beta',
      type: 'medbed',
      description: 'Advanced holographic cellular repair. Targets specific injuries and chronic pain.',
      hourly_rate: 20000, // $200.00
      image_url: 'https://placehold.co/600x400?text=Holographic+MedBed',
    }
  ]);

  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);

  // Fake slots generator for demo
  const generateSlots = () => {
    return [
      { time: '09:00', available: true },
      { time: '10:00', available: false },
      { time: '11:00', available: true },
      { time: '13:00', available: true },
      { time: '14:00', available: true },
      { time: '15:00', available: false },
    ];
  };

  const handleBook = async () => {
    if (!selectedFacility || !selectedSlot) return;

    setLoading(true);
    try {
      // In a real implementation, you'd call:
      // await api.post('/appointments/book', {
      //   providerId: selectedFacility.id,
      //   date: selectedDate,
      //   time: selectedSlot,
      //   type: selectedFacility.type
      // });

      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      showToast('Session booked successfully! Check your email for confirmation.', 'success');
      navigate('/dashboard');
    } catch (err) {
      showToast('Failed to book session. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">MedBed & Chamber Booking</h1>
        <p className="mt-2 text-lg text-gray-600">
          Select a facility below to schedule your regeneration session.
        </p>
      </div>

      {!selectedFacility ? (
        // List View
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <div key={facility.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <img
                src={facility.image_url}
                alt={facility.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full mb-2 ${
                      facility.type === 'medbed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {facility.type === 'medbed' ? 'MedBed' : 'Chamber'}
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900">{facility.name}</h3>
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    ${(facility.hourly_rate / 100).toFixed(0)}
                    <span className="text-sm font-normal text-gray-500">/hr</span>
                  </span>
                </div>
                <p className="mt-2 text-gray-600 text-sm h-12 overflow-hidden">
                  {facility.description}
                </p>
                <button
                  onClick={() => setSelectedFacility(facility)}
                  className="mt-4 w-full bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 transition-colors"
                >
                  Select Unit
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Booking View
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-2xl font-semibold text-gray-800">Booking: {selectedFacility.name}</h2>
            <button
              onClick={() => setSelectedFacility(null)}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              ← Back to list
            </button>
          </div>

          <div className="p-6 grid md:grid-cols-2 gap-8">
            {/* Left Column: Details */}
            <div>
              <img
                src={selectedFacility.image_url}
                alt={selectedFacility.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Description</h3>
                  <p className="text-gray-600">{selectedFacility.description}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Price</h3>
                  <p className="text-xl font-bold text-teal-600">
                    ${(selectedFacility.hourly_rate / 100).toFixed(2)}
                    <span className="text-sm text-gray-500 font-normal"> per session</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Calendar & Slots */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot('');
                  }}
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Available Slots
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {generateSlots().map((slot) => (
                      <button
                        key={slot.time}
                        className={`p-2 text-sm rounded-md border ${
                          !slot.available
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                            : selectedSlot === slot.time
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-700 hover:border-teal-500 border-gray-300'
                        }`}
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.time)}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button
                  onClick={handleBook}
                  disabled={!selectedSlot || loading}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium text-lg shadow-sm transition-all ${
                    !selectedSlot || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {loading ? 'Processing...' : 'Confirm Booking'}
                </button>
                <p className="text-center text-xs text-gray-500 mt-2">
                  Payment will be processed securely via Stripe
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
