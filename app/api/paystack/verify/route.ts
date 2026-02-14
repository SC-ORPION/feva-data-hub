import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// Bundle pricing configuration
const BUNDLE_PRICES: Record<number, number> = {
  1: 2.5,
  2: 4.5,
  5: 10.0,
  10: 18.0,
};

// Network code mapping
const NETWORK_CODES: Record<string, string> = {
  'YELLO': 'MTN',
  'TELECEL': 'Vodafone',
  'AT_PREMIUM': 'AirtelTigo',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing payment reference' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    if (!verifyResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 502 }
      );
    }

    const verifyData = await verifyResponse.json();

    // Check if payment was successful
    if (!verifyData.data || verifyData.data.status !== 'success') {
      return NextResponse.json(
        { error: 'Payment was not successful' },
        { status: 400 }
      );
    }

    const { userId, phoneNumber, network, dataSize } = verifyData.data.metadata;
    const amount = verifyData.data.amount / 100; // Convert from kobo back to GHS
    const bundlePrice = BUNDLE_PRICES[dataSize];

    // Call DataMart API to deliver data
    const apiKey = process.env.DATA_API_KEY;
    const apiUrl = process.env.DATA_API_URL || 'https://api.datamartgh.shop';

    const datamartResponse = await fetch(`${apiUrl}/api/developer/purchase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey || '',
      },
      body: JSON.stringify({
        phoneNumber,
        network: network.toUpperCase(),
        capacity: dataSize.toString(),
        gateway: 'paystack',
      }),
    });

    if (!datamartResponse.ok) {
      const errorData = await datamartResponse.json();
      console.error('DataMart API error:', errorData);
      return NextResponse.json(
        { error: `Data delivery failed: ${errorData.message || 'Unknown error'}` },
        { status: 502 }
      );
    }

    const datamartResult = await datamartResponse.json();

    // Verify API success
    if (datamartResult.status !== 'success') {
      return NextResponse.json(
        { error: datamartResult.message || 'Data delivery failed' },
        { status: 400 }
      );
    }

    // Record transaction
    const { error: transactionError } = await supabase.from('transactions').insert([
      {
        user_id: userId,
        phone_number: phoneNumber,
        network: NETWORK_CODES[network] || network,
        data_size: dataSize,
        amount: bundlePrice,
        status: 'completed',
        external_ref: datamartResult.data?.transactionReference || reference,
        payment_method: 'paystack',
      },
    ]);

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Payment successful! Data has been delivered.',
        reference,
        amount,
        transactionReference: datamartResult.data?.transactionReference,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
