import { NextResponse } from "next/server";

export async function POST() {
  try {
    return NextResponse.json({ 
      success: true, 
      message: "Work session stopped" 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}