'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/supabase/auth-context';
import { AlertCircle, CheckCircle, Loader, CreditCard, Landmark } from 'lucide-react';

const networks = [
  { code: 'YELLO', name: 'MTN' },
  { code: 'TELECEL', name: 'Vodafone' },
  { code: 'AT_PREMIUM', name: 'AirtelTigo' },
];

const bundles = [
  { size: 1, price: 2.5 },
  { size: 2, price: 4.5 },
  { size: 5, price: 10.0 },
  { size: 10, price: 18.0 },
];

export default function BuyDataPage() {
  const { user, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    network: '',
    dataSize: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'paystack'>('wallet');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string; txRef?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user) {
        throw new Error('You must be logged in to purchase data');
      }

      if (paymentMethod === 'wallet') {
        // Existing wallet payment flow
        const response = await fetch('/api/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: formData.phoneNumber,
            network: formData.network,
            dataSize: parseInt(formData.dataSize),
            userId: user.id,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          setMessage({
            type: 'success',
            text: `Purchase successful! Data bundle will be delivered to ${formData.phoneNumber}`,
            txRef: result.transactionReference,
          });
          setFormData({ phoneNumber: '', network: '', dataSize: '' });
        } else {
          setMessage({ type: 'error', text: result.error || 'Purchase failed. Please try again.' });
        }
      } else {
        // Paystack payment flow
        const selectedBundle = bundles.find((b) => b.size === parseInt(formData.dataSize));
        
        const response = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: selectedBundle?.price,
            userId: user.id,
            phoneNumber: formData.phoneNumber,
            network: formData.network,
            dataSize: parseInt(formData.dataSize),
          }),
        });

        const result = await response.json();

        if (response.ok && result.authorizationUrl) {
          // Redirect to Paystack payment page
          window.location.href = result.authorizationUrl;
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to initiate payment. Please try again.' });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const selectedBundle =
    bundles.find((b) => b.size === parseInt(formData.dataSize)) || null;
  const selectedNetworkName = networks.find(n => n.code === formData.network)?.name || '';

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Buy Mobile Data</h1>
        <p className="text-gray-600">Purchase data bundles for any Nigerian network</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{message.text}</p>
            {message.txRef && (
              <p className="text-sm mt-1 opacity-75">Transaction ID: {message.txRef}</p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-900 mb-2">
            Recipient Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            placeholder="e.g., 0551234567 or +233551234567"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">The phone number that will receive the data</p>
        </div>

        {/* Network Selection */}
        <div>
          <label htmlFor="network" className="block text-sm font-medium text-gray-900 mb-2">
            Network Provider
          </label>
          <div className="grid grid-cols-1 gap-2">
            {networks.map((net) => (
              <label key={net.code} className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition">
                <input
                  type="radio"
                  name="network"
                  value={net.code}
                  checked={formData.network === net.code}
                  onChange={handleChange}
                  required
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-3 text-gray-900 font-medium">{net.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Data Bundle Selection */}
        <div>
          <label htmlFor="dataSize" className="block text-sm font-medium text-gray-900 mb-2">
            Data Bundle
          </label>
          <div className="grid grid-cols-2 gap-3">
            {bundles.map((bundle) => (
              <label
                key={bundle.size}
                className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                  formData.dataSize === bundle.size.toString()
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <input
                  type="radio"
                  name="dataSize"
                  value={bundle.size}
                  checked={formData.dataSize === bundle.size.toString()}
                  onChange={handleChange}
                  required
                  className="hidden"
                />
                <div className="text-lg font-bold text-gray-900">{bundle.size}GB</div>
                <div className="text-sm text-blue-600 font-semibold">GHS {bundle.price.toFixed(2)}</div>
              </label>
            ))}
          </div>
        </div>

        {/* Summary */}
        {selectedBundle && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={20} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900">Order Summary</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Phone:</span>
                <span className="font-medium text-gray-900">{formData.phoneNumber || 'Not entered'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network:</span>
                <span className="font-medium text-gray-900">{selectedNetworkName || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Bundle:</span>
                <span className="font-medium text-gray-900">{selectedBundle.size}GB</span>
              </div>
              <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                <span className="text-gray-900 font-semibold">Total Amount:</span>
                <span className="font-bold text-blue-600 text-lg">GHS {selectedBundle.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`p-4 border-2 rounded-lg cursor-pointer transition flex items-center gap-3 ${
              paymentMethod === 'wallet' 
                ? 'border-blue-600 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value as 'wallet' | 'paystack')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Wallet</div>
                <div className="text-xs text-gray-600">Use account balance</div>
              </div>
            </label>
            <label className={`p-4 border-2 rounded-lg cursor-pointer transition flex items-center gap-3 ${
              paymentMethod === 'paystack' 
                ? 'border-blue-600 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-300'
            }`}>
              <input
                type="radio"
                name="paymentMethod"
                value="paystack"
                checked={paymentMethod === 'paystack'}
                onChange={(e) => setPaymentMethod(e.target.value as 'wallet' | 'paystack')}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <div className="font-semibold text-gray-900">Paystack</div>
                <div className="text-xs text-gray-600">Card, Mobile money</div>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !formData.phoneNumber || !formData.network || !formData.dataSize}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader size={18} className="animate-spin" />}
          {loading ? 'Processing...' : paymentMethod === 'wallet' ? 'Proceed with Wallet' : 'Proceed to Paystack'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          ✓ Fast delivery • ✓ Secure payment • ✓ 24/7 support
        </p>
      </form>
    </div>
  );
}
