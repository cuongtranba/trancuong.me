import type { APIRoute } from "astro";

// Content Signals (https://contentsignals.org/) declare how this site's content
// may be used by automated clients. They are preferences, not access controls:
//   search   = inclusion in a search index / search results
//   ai-input = use as input to generate an AI response (e.g. RAG, AI overviews)
//   ai-train = use to train or fine-tune an AI model
const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Content-Signal: search=yes, ai-input=yes, ai-train=yes
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(sitemapURL));
};
