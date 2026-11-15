/** Identity of the published site. Every absolute URL produced by the project derives from it. */
export const site = {
  name: 'Titanic 4D',
  canonicalOrigin: 'https://www.titanic-4d.org',
  secondaryHosts: ['titanic-4d.org', 'www.titanic-4d.com', 'titanic-4d.com'],
  contactEmail: 'contact@titanic-4d.org',
  repositoryUrl: 'https://github.com/j-about/Titanic-4D',
} as const;

/** Resolves a root-relative path against the canonical origin. */
export function canonicalUrl(path: string): string {
  return new URL(path, site.canonicalOrigin).href;
}
