import { isAffiliateFunnelEnabled } from "@/lib/config";

export function isAffiliateFunnelActive() {
  return isAffiliateFunnelEnabled();
}

export async function processAffiliateLead() {
  if (!isAffiliateFunnelActive()) {
    console.log("Affiliate funnel not configured");
    return;
  }
  
  console.log("Processing affiliate lead");
}
