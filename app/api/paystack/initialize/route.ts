import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, userId, phoneNumber, network, dataSize } = body;

    // Validate inputs
    if (!email || !amount || !userId || !phoneNumber || !network || !dataSize) {
      return NextResponse.json(
        { error: 'Missing required fields: email, amount, userId, phoneNumber, network, dataSize' },
        { status: 400 }
      );
    }

    // Get the host from the request for callback URL
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const callbackUrl = `${protocol}://${host}/dashboard/buy-data/paystack-callback`;

    // Initialize Paystack transaction
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects amount in kobo (cents)
        callback_url: callbackUrl,
        metadata: {
          userId,
          phoneNumber,
          network,
          dataSize,
          transactionType: 'data_purchase',
        },
      }),
    });

    if (!paystackResponse.ok) {
      const error = await paystackResponse.json();
      console.error('Paystack initialization error:', error);
      return NextResponse.json(
        { error: `Paystack error: ${error.message || 'Failed to initialize payment'}` },
        { status: 502 }
      );
    }

    const paystackData = await paystackResponse.json();

    return NextResponse.json(
      {
        success: true,
        reference: paystackData.data.reference,
        authorizationUrl: paystackData.data.authorization_url,
        accessCode: paystackData.data.access_code,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment initialization failed' },
      { status: 500 }
    );
  }
}
