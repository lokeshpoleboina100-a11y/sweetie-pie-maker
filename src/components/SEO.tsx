import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://sweetie-pie-maker.lovable.app';
const DEFAULT_IMAGE = `${SITE_URL}/pwa-512.png`;

export interface SEOProps {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string;
  type?: 'website' | 'article' | 'profile';
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Per-page SEO tags. Injects title, description, canonical, OG, Twitter,
 * robots, and optional JSON-LD. Deduplicates against the static <head>.
 */
export function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_IMAGE,
  keywords,
  type = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const structured = jsonLd
    ? Array.isArray(jsonLd) ? jsonLd : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <meta
        name="robots"
        content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}
      />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="NearWork" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {structured.map((data, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}

export default SEO;
