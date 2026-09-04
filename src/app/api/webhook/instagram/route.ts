import { NextRequest, NextResponse } from "next/server";
import { handleWebhookVerification, handleWebhookEvent } from "@/integrations/instagram/webhook-handler";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const challenge = handleWebhookVerification(url.searchParams);
  
  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const payload = JSON.parse(rawBody);
    
    await handleWebhookEvent(rawBody, signature, payload);
    
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}
