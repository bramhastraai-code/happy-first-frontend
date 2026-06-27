import LandingPage from '@/components/landing/LandingPage';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/JsonLd';
import { landingPageMetadata } from '@/lib/site-metadata';

export const metadata = landingPageMetadata;

export default function RootPage() {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <LandingPage />
    </>
  );
}
