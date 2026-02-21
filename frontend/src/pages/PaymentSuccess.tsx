import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

export function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'processing'>('loading');
  const paymentIntent = searchParams.get('payment_intent');

  useEffect(() => {
    const redirectStatus = searchParams.get('redirect_status');
    if (redirectStatus === 'succeeded') {
      setStatus('success');
    } else {
      setStatus('processing');
    }
  }, [searchParams]);

  return (
    <div className="max-w-lg mx-auto mt-16 text-center">
      {status === 'loading' && (
        <div className="animate-pulse">
          <div className="h-16 w-16 mx-auto rounded-full bg-gray-200" />
          <p className="mt-4 text-gray-500">Verifying payment...</p>
        </div>
      )}

      {status === 'success' && (
        <>
          <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Payment Successful!</h1>
          <p className="mt-2 text-gray-600">
            Your payment has been processed successfully.
            {paymentIntent && (
              <span className="block mt-1 text-sm text-gray-400">
                Reference: {paymentIntent.slice(-8)}
              </span>
            )}
          </p>
        </>
      )}

      {status === 'processing' && (
        <>
          <div className="h-16 w-16 mx-auto rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Payment Processing</h1>
          <p className="mt-2 text-gray-600">
            Your payment is being processed. You&apos;ll receive a confirmation shortly.
          </p>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          to="/history"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          View Payment History
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default PaymentSuccess;
