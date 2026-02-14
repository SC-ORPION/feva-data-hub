import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { message } = body;

    // Store broadcast message in database
    const { error } = await supabase.from('broadcasts').insert([
      {
        message,
        sent_by: user.id,
        sent_at: new Date(),
      },
    ]);

    if (error) throw error;

    return NextResponse.json(
      { success: true, message: 'Broadcast sent' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Broadcast error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}
