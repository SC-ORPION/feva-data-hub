import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function PUT(request: NextRequest) {
  try {
    // Check if user is admin
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { prices } = body;

    // Update pricing in database
    const { error } = await supabase
      .from('pricing')
      .update({ prices })
      .eq('id', 1);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Pricing update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update pricing' },
      { status: 500 }
    );
  }
}
