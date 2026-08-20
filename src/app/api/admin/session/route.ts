import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin/adminAuth';

export async function GET(req: NextRequest) {
  const isAdmin = verifyAdminRequest(req);
  return NextResponse.json({ authenticated: isAdmin });
}
