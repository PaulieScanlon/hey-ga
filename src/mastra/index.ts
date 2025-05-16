import { Mastra } from '@mastra/core';
import { heyGaAgent } from './agents/hey-ga-agent';

export const mastra = new Mastra({
  agents: { heyGaAgent },
});
