import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";

import { heyGaAgent } from "./agents/hey-ga-agent";

export const mastra = new Mastra({
  agents: { heyGaAgent },
  storage: new LibSQLStore({
    url: "file:../mastra.db"
  })
});
