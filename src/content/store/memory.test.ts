import { contractSuite } from './contract-suite';
import { createMemoryStore } from './memory';

contractSuite('memory', {
  seeded: async (seed, seedAuthor, now) => createMemoryStore({ seed, seedAuthor, now }),
  empty: async () => createMemoryStore(),
});
