'use client';

import { useState } from 'react';

export default function AdminPricingPage() {
  const [prices, setPrices] = useState([
    { size: 1, price: 2.5 },
    { size: 2, price: 4.5 },
    { size: 5, price: 10.0 },
    { size: 10, price: 18.0 },
  ]);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...prices];
    updated[index].price = newPrice;
    setPrices(updated);
  };

  const handleUpdatePrices = async () => {
    setUpdating(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Prices updated successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to update prices' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Pricing Management</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-8">
        <div className="space-y-6">
          {prices.map((item, index) => (
            <div key={index} className="flex items-center gap-4 pb-4 border-b last:border-b-0">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{item.size}GB</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">GHS</span>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                  step="0.01"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleUpdatePrices}
          disabled={updating}
          className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {updating ? 'Updating...' : 'Update Prices'}
        </button>
      </div>
    </div>
  );
}
