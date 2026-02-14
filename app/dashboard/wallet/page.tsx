'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Minus } from 'lucide-react';

export default function WalletPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [transactionType, setTransactionType] = useState('deposit');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setBalance(data.balance);
        }
      }
      setLoading(false);
    };

    fetchWallet();
  }, []);

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const numAmount = parseFloat(amount);

      // In a real app, this would process payment with a gateway like Stripe/PayPal
      // For now, we'll just update the balance
      const newBalance =
        transactionType === 'deposit' ? balance + numAmount : balance - numAmount;

      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      const { error } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('user_id', user.id);

      if (error) throw error;

      setBalance(newBalance);
      setAmount('');
      setMessage({
        type: 'success',
        text: `${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!`,
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Wallet</h1>

      {/* Current Balance */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-lg shadow-lg p-8 text-white mb-8">
        <p className="text-sm opacity-90">Current Balance</p>
        <p className="text-4xl font-bold">GHS {balance.toFixed(2)}</p>
      </div>

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

      {/* Deposit/Withdraw Form */}
      <form onSubmit={handleTransaction} className="bg-white rounded-lg shadow p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-4">
              Transaction Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="deposit"
                  checked={transactionType === 'deposit'}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="mr-2"
                />
                <Plus size={20} className="mr-2 text-green-600" />
                <span>Deposit</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="withdraw"
                  checked={transactionType === 'withdraw'}
                  onChange={(e) => setTransactionType(e.target.value)}
                  className="mr-2"
                />
                <Minus size={20} className="mr-2 text-red-600" />
                <span>Withdraw</span>
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-2">
              Amount (GHS)
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={processing}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              transactionType === 'deposit'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            } disabled:opacity-50`}
          >
            {processing
              ? 'Processing...'
              : `${transactionType === 'deposit' ? 'Deposit' : 'Withdraw'} Now`}
          </button>
        </div>
      </form>
    </div>
  );
}
