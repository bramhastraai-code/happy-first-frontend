import { BRAND_DESCRIPTION, BRAND_NAME, getSiteOrigin } from '@/lib/brand';

export function OrganizationJsonLd() {
  const siteUrl = getSiteOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: siteUrl,
    logo: `${siteUrl}/icon`,
    description: BRAND_DESCRIPTION,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebSiteJsonLd() {
  const siteUrl = getSiteOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: BRAND_NAME,
    url: siteUrl,
    description: BRAND_DESCRIPTION,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
