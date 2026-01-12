const isDev = import.meta.env.DEV;

// In production, use Vercel serverless proxies
// In dev, use Vite proxy (configured in vite.config.ts)

export function proxyUrl(localPath: string): string {
  // In dev mode, return local path as-is (Vite proxy handles it)
  if (isDev) {
    return localPath;
  }

  // In production, paths are handled by Vercel serverless functions
  // No need for external CORS proxy
  return localPath;
}

export async function fetchWithProxy(url: string): Promise<Response> {
  // In dev, the app calls `/api/rss-proxy?url=...`. Vite defines a set of
  // `/rss/*` proxies in `vite.config.ts`. Map common feed hostnames to those
  // local proxy prefixes to avoid CORS issues when developing locally.
  if (isDev && url.startsWith('/api/rss-proxy')) {
    try {
      const parsed = new URL(url, window.location.origin);
      const feedUrl = parsed.searchParams.get('url');
      if (feedUrl) {
        const u = new URL(feedUrl);
        const hostMap: Record<string, string> = {
          'feeds.bbci.co.uk': '/rss/bbc',
          'www.theguardian.com': '/rss/guardian',
          'feeds.npr.org': '/rss/npr',
          'rss.cnn.com': '/rss/cnn',
          'hnrss.org': '/rss/hn',
          'feeds.arstechnica.com': '/rss/arstechnica',
          'www.theverge.com': '/rss/verge',
          'www.cnbc.com': '/rss/cnbc',
          'feeds.marketwatch.com': '/rss/marketwatch',
          'www.defenseone.com': '/rss/defenseone',
          'breakingdefense.com': '/rss/breakingdefense',
          'www.bellingcat.com': '/rss/bellingcat',
          'techcrunch.com': '/rss/techcrunch',
          'news.google.com': '/rss/googlenews',
          'openai.com': '/rss/openai',
          'huggingface.co': '/rss/huggingface',
          'www.technologyreview.com': '/rss/techreview',
          'rss.arxiv.org': '/rss/arxiv',
          'www.reutersagency.com': '/rss/reuters',
          'feeds.reuters.com': '/rss/reuters',
        };

        const prefix = hostMap[u.hostname];
        if (prefix) {
          // Preserve pathname and query when calling the local proxy
          const localPath = prefix + (u.pathname || '/') + (u.search || '');
          console.debug('[proxy] Using local RSS proxy for', u.hostname, '->', localPath);
          return fetch(localPath);
        }
      }
    } catch (e) {
      console.warn('[proxy] Failed to rewrite RSS proxy URL:', e);
      // fall through to default fetch
    }
  }

  return fetch(url);
}
