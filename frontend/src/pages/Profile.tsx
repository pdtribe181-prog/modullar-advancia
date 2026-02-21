import { useState, useEffect } from 'react';
import { useAuth } from '../providers/AuthProvider';
import { api, ApiError } from '../services/api';
import { Spinner, LoadingButton } from '../components/Spinner';
import { useToast } from '../components/Toast';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  stripe_customer_id: string | null;
  created_at: string;
}

export default function Profile() {
  useAuth(); // Ensures user is authenticated
  const { showToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
  });

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get<UserProfile>('/auth/profile');
      setProfile(response);
      setFormData({
        full_name: response.full_name || '',
        phone: response.phone || '',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load profile';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await api.put<UserProfile>('/auth/profile', formData);
      setProfile(response);
      showToast('Profile updated successfully', 'success');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to update profile';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Spinner size={48} />
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account information
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={profile?.email || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
            <p className="mt-1 text-sm text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500"
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Account Role
            </label>
            <div className="mt-1">
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-teal-100 text-teal-800">
                {profile?.role || 'User'}
              </span>
            </div>
          </div>

          {profile?.stripe_customer_id && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Profile
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Stripe Customer ID: {profile.stripe_customer_id.slice(0, 20)}...
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-gray-200">
            <LoadingButton
              type="submit"
              loading={saving}
              loadingText="Saving..."
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              Save Changes
            </LoadingButton>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Account Details</h2>
        </div>
        <div className="p-6">
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Account Created</dt>
              <dd className="text-sm text-gray-900">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="text-sm text-gray-900 font-mono">
                {profile?.id?.slice(0, 8)}...
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
