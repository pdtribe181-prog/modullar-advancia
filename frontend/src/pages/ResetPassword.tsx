import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

/**
 * Password reset page — user lands here from the email link.
 * Supabase appends `#access_token=xxx&type=recovery` to the URL.
 * We extract the token, set it as the Bearer token, then call PUT /auth/password.
 */
export function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Supabase puts the recovery token in the URL hash fragment
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const tokenType = hashParams.get('type');
  const hasToken = tokenType === 'recovery' && !!accessToken;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Authenticate with the recovery token before calling the protected endpoint
      api.setToken(accessToken!);
      await api.put('/auth/password', { password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken && !success) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Invalid Reset Link</h1>
        <p className="mt-2 text-gray-600">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">Password Updated</h1>
        <p className="mt-2 text-gray-600">Your password has been successfully reset.</p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center">Reset Your Password</h1>
      <p className="mt-2 text-gray-600 text-center">Enter your new password below.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            New Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default ResetPassword;
