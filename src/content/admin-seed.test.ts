import { describe, expect, it } from 'vitest';
import seed from './sources/fixtures/admin-seed.json';
import { SiteContent } from './schema';

describe('Google Sheet import for the first database version', () => {
  it('contains the live site sections and passes the public contract', () => {
    const content = SiteContent.parse(seed);
    expect(content.schedule).toHaveLength(47);
    expect(content.prices).toHaveLength(4);
    expect(content.coaches.map(coach => coach.name)).toEqual(['Feu Ferreira', 'Ana Lima']);
    expect(content.config.address.city).toBe('Lisboa');
    expect(content.meta.warnings).toEqual([]);
  });
});
