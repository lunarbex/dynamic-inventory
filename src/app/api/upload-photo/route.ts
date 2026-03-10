import { NextRequest, NextResponse } from "next/server";
// Photo uploads are handled client-side directly to Firebase Storage.
// This route is a placeholder for any server-side processing needed.
export async function POST(req: NextRequest) {
  return NextResponse.json({ message: "Use client-side Firebase Storage upload." }, { status: 200 });
}
