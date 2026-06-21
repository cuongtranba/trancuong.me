import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

/**
 * `/llms.txt` — an LLM-friendly overview of the site per https://llmstxt.org/.
 * Lists published posts (drafts/scheduled excluded via `getSortedPosts`) with
 * absolute URLs so an agent can fetch the full content of any entry.
 */
export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");
  const sortedPosts = getSortedPosts(posts);

  const items = sortedPosts.map(({ data, id, filePath }) => {
    const url = new URL(
      getPostUrl(id, filePath, config.site.lang),
      config.site.url
    ).href;
    return `- [${data.title}](${url}): ${data.description}`;
  });

  const body = `# ${config.site.title}

> ${config.site.description}

## Posts

${items.join("\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
