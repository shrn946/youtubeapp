import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Exports are generated client-side so video metadata never needs to be uploaded again.",
    formats: ["csv", "xlsx"],
  });
}
