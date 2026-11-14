import { describe, expect, it } from 'vitest';
import { canonicalUrl, site } from './site.ts';

describe('site configuration', () => {
  it('uses the www host over HTTPS as the canonical origin', () => {
    expect(site.canonicalOrigin).toBe('https://www.titanic-4d.org');
  });

  it('never lists the canonical host among the redirected hosts', () => {
    expect(site.secondaryHosts).not.toContain(new URL(site.canonicalOrigin).host);
  });

  it('resolves root-relative paths against the canonical origin', () => {
    expect(canonicalUrl('/')).toBe('https://www.titanic-4d.org/');
    expect(canonicalUrl('/legal-notice/')).toBe('https://www.titanic-4d.org/legal-notice/');
  });
});
