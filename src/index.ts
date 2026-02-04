import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

// --- 1. TOOL DEFINITIONS ---

const server = new McpServer({
  name: "trustly-gaming-engine",
  version: "1.0.0",
});

// Tool: ROI Calculator
server.tool(
  "calculate_operator_roi",
  {
    operator_name: z.string().describe("Name of the gaming operator"),
    monthly_volume_usd: z.number().describe("Total monthly deposit volume in USD"),
  },
  async ({ operator_name, monthly_volume_usd }) => {
    const card_fee = 0.025;
    const card_accept = 0.85;
    const trustly_fee = 0.01;
    const trustly_accept = 0.98;

    const rev_cards = monthly_volume_usd * card_accept;
    const rev_trustly = monthly_volume_usd * trustly_accept;
    const revenue_uplift = rev_trustly - rev_cards;
    const fee_savings = (rev_cards * card_fee) - (rev_trustly * trustly_fee);

    return {
      content: [{ 
        type: "text", 
        text: `ROI Analysis for ${operator_name}:\n` +
              `Revenue Uplift: $${revenue_uplift.toLocaleString()}\n` +
              `Fee Savings: $${fee_savings.toLocaleString()}\n` +
              `Total Annual Benefit: $${((revenue_uplift + fee_savings) * 12).toLocaleString()}`
      }],
    };
  }
);

// Tool: Player Insights
server.tool(
  "get_player_payout_insights",
  {
    category: z.enum(["sports_betting", "igaming", "esports"]),
  },
  async ({ category }) => {
    const data = {
      sports_betting: "Players hate 3-5 day waits. 72% will switch apps for Instant Payouts.",
      igaming: "KYC friction causes 40% drop-off. Market needs 'Pay n Play'.",
      esports: "Bank flags are blocking micro-transactions."
    };
    return {
      content: [{ type: "text", text: data[category] || "No data." }],
    };
  }
);

// Tool: Compliance Check
server.tool(
  "scan_gaming_compliance",
  { marketing_copy: z.string() },
  async ({ marketing_copy }) => {
    const risks = [];
    const text = marketing_copy.toLowerCase();
    if (text.includes("guaranteed")) risks.push("Avoid 'Guaranteed' (implies winning).");
    if (text.includes("free money")) risks.push("Avoid 'Free Money' (predatory).");
    if (!text.includes("terms apply")) risks.push("Missing 'Terms Apply'.");
    
    return {
      content: [{ 
        type: "text", 
        text: risks.length ? `REJECTED ❌\nIssues:\n- ${risks.join("\n- ")}` : "APPROVED ✅" 
      }],
    };
  }
);

// --- 2. EXPRESS SERVER WITH SSE SUPPORT ---

const app = express();
// This map stores active connections so we can handle follow-up messages
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  console.log("New SSE connection initiated");
  
  const transport = new SSEServerTransport("/messages", res);
  // Using a simple ID for the session. In production, use a UUID.
  const sessionId = "session-" + Date.now();
  transports.set(sessionId, transport);

  // When the connection closes, clean up
  req.on("close", () => {
    console.log("SSE connection closed");
    transports.delete(sessionId);
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  // In a real implementation, you would parse the session ID from the query string
  // For this simple demo, we just grab the most recent transport
  // (Note: This limits the server to one active user at a time, which is fine for a demo)
  const transport = Array.from(transports.values()).pop();

  if (!transport) {
    res.status(404).send("No active session");
    return;
  }

  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trustly Gaming MCP running on port ${PORT}`);
});