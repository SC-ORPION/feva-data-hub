import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.DATA_API_URL;
    const apiKey = process.env.DATA_API_KEY;

    const response = await axios.get(
      `${apiUrl}/api/developer/data-packages`,
      {
        headers: {
          'X-API-Key': apiKey,
        },
      }
    );

    return NextResponse.json(response.data, { status: 200 });
  } catch (error: any) {
    console.error('Packages fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}
