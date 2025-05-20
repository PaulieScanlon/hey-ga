import "dotenv/config";
 
import { mastra } from "./mastra";
 
async function main() {
  const agent = await mastra.getAgent("heyGaAgent");
 
  const result = await agent.generate("Show me page views for the last 30 days");
 
  console.log("Agent response:", result.text);
}
 
main();