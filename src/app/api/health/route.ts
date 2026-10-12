import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      message: 'AI Coding Interview Platform API is running.',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
