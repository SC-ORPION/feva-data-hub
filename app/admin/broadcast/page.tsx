'use client';

import { useState } from 'react';

export default function AdminBroadcastPage() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{ type: string; text: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResponse(null);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (res.ok) {
        setResponse({ type: 'success', text: 'Message broadcast sent successfully' });
        setMessage('');
      } else {
        setResponse({ type: 'error', text: 'Failed to send broadcast' });
      }
    } catch (err: any) {
      setResponse({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Broadcast Message</h1>

      {response && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            response.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {response.text}
        </div>
      )}

      <form onSubmit={handleSend} className="bg-white rounded-lg shadow p-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
              Message
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message to broadcast to all users..."
              required
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </form>
    </div>
  );
}
