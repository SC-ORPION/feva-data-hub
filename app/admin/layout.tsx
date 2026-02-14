'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users, CreditCard, MessageSquare, Settings } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Check if user is admin (you would typically verify this with a custom claim or a users table)
      // For demo purposes, we'll check if user email contains 'admin'
      if (!user.email?.includes('admin')) {
        router.push('/dashboard');
        return;
      }

      setUser(user);
      setIsAdmin(true);
      setLoading(false);
    };

    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-2xl font-semibold text-gray-900">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const adminItems = [
    { href: '/admin', label: 'Dashboard', icon: Users },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/admin/pricing', label: 'Pricing', icon: Settings },
    { href: '/admin/broadcast', label: 'Broadcast', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">FEVA Admin</h1>
        <nav className="space-y-4">
          {adminItems.map(({ href, label, icon: Icon }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-4 px-4 py-3 hover:bg-gray-800 rounded-lg transition"
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end">
            <span className="text-gray-700">{user?.email}</span>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
