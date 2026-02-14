'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader } from 'lucide-react';
import Link from 'next/link';

export default function PaystackCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');

        if (!reference) {
          setStatus('failed');
          setMessage('No payment reference found. Payment may have been cancelled.');
          return;
        }

        // Call verify endpoint
        const response = await fetch('/api/paystack/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reference }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setStatus('success');
          setMessage(result.message);
          setTransactionRef(result.transactionReference || reference);
        } else {
          setStatus('failed');
          setMessage(result.error || 'Payment verification failed. Please contact support.');
          setTransactionRef(reference);
        }
      } catch (error: any) {
        setStatus('failed');
        setMessage(error.message || 'An error occurred during verification.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader size={48} className="mx-auto mb-4 animate-spin text-blue-600" />
            <p className="text-gray-600">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {transactionRef && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500">Transaction ID</p>
                <p className="font-mono text-sm text-gray-900 break-all">{transactionRef}</p>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-6">
              Your data bundle will be delivered shortly. Check your transactions page for details.
            </p>
            <Link
              href="/dashboard/transactions"
              className="inline-block w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              View Transactions
            </Link>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <AlertCircle size={64} className="mx-auto mb-4 text-red-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            {transactionRef && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500">Reference</p>
                <p className="font-mono text-sm text-gray-900 break-all">{transactionRef}</p>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-6">
              Please try again or contact support if the problem persists.
            </p>
            <div className="space-y-2">
              <Link
                href="/dashboard/buy-data"
                className="block w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Try Again
              </Link>
              <Link
                href="/dashboard"
                className="block w-full bg-gray-200 text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
