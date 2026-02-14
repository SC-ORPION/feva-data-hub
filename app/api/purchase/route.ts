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
    const { phoneNumber, network, dataSize, userId } = body;

    // Validate inputs
    if (!phoneNumber || !network || !dataSize || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumber, network, dataSize, userId' },
        { status: 400 }
      );
    }

    // Validate data size
    if (!(dataSize in BUNDLE_PRICES)) {
      return NextResponse.json(
        { error: 'Invalid data size. Allowed sizes: 1, 2, 5, 10 GB' },
        { status: 400 }
      );
    }

    const bundlePrice = BUNDLE_PRICES[dataSize];

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      // Create wallet if it doesn't exist
      await supabase.from('wallets').insert([
        {
          user_id: userId,
          balance: 0,
        },
      ]);
      
      return NextResponse.json(
        { error: 'Insufficient wallet balance. Please fund your wallet.' },
        { status: 402 }
      );
    }

    if (wallet.balance < bundlePrice) {
      return NextResponse.json(
        { 
          error: `Insufficient balance. Required: GHS ${bundlePrice.toFixed(2)}, Available: GHS ${wallet.balance.toFixed(2)}`,
          requiredAmount: bundlePrice,
          currentBalance: wallet.balance,
        },
        { status: 402 }
      );
    }

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
        gateway: 'wallet',
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

    // Deduct from wallet
    const newBalance = wallet.balance - bundlePrice;
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Wallet update error:', updateError);
      throw updateError;
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
        external_ref: datamartResult.data?.transactionReference || datamartResult.data?.reference || 'pending',
      },
    ]);

    if (transactionError) {
      console.error('Transaction record error:', transactionError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Purchase successful! Data will be delivered shortly.',
        transactionReference: datamartResult.data?.transactionReference,
        newBalance,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Purchase API error:', error);
    return NextResponse.json(
      { error: error.message || 'Purchase failed. Please try again.' },
      { status: 500 }
    );
  }
}
