(() => {
  const FALLBACK_JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';
  const ALLORIGINS_RAW = 'https://api.allorigins.win/raw?url='; // CORS proxy that returns raw content
  const FETCH_TIMEOUT_MS = 4500;
  const CACHE_KEY = 'mediumBlogPostsCache:v1';
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

  const section = document.querySelector('#Blogs');
  const statusEl = document.getElementById('mediumBlogStatus');
  const gridEl = document.getElementById('mediumBlogGrid');

  if (!section || !statusEl || !gridEl) {
    return;
  }

  const feedUrl = section.dataset.feedUrl || 'https://medium.com/feed/@imdaxsh';
  const postLimit = Number(section.dataset.postLimit || 10);

  function setStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.classList.toggle('is-error', type === 'error');
  }

  function parseFeedItems(xmlText) {
    const xml = new DOMParser().parseFromString(xmlText, 'text/xml');

    if (xml.querySelector('parsererror')) {
      throw new Error('Unable to parse the Medium RSS feed.');
    }

    const rssItems = Array.from(xml.querySelectorAll('item')).map(normalizeRssItem);
    const atomEntries = Array.from(xml.querySelectorAll('entry')).map(normalizeAtomEntry);

    return rssItems.concat(atomEntries);
  }

  function withTimeout(promise, timeoutMs, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      })
    ]);
  }

  function getCachedPosts() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) {
        return null;
      }

      const cached = JSON.parse(raw);
      if (!cached || !Array.isArray(cached.posts) || !cached.savedAt) {
        return null;
      }

      if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
        return null;
      }

      return cached.posts;
    } catch {
      return null;
    }
  }

  function setCachedPosts(posts) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        savedAt: Date.now(),
        posts
      }));
    } catch {
      // Ignore storage failures in private mode or blocked storage environments.
    }
  }

  function renderSkeletons(count) {
    gridEl.innerHTML = Array.from({ length: count }, () => `
      <article class="blog-skeleton" aria-hidden="true">
        <div class="blog-skeleton__media"></div>
        <div class="blog-skeleton__body">
          <div class="blog-skeleton__line is-medium"></div>
          <div class="blog-skeleton__line is-short"></div>
          <div class="blog-skeleton__line"></div>
          <div class="blog-skeleton__line"></div>
          <div class="blog-skeleton__button"></div>
        </div>
      </article>
    `).join('');
  }

  function stripHtml(value) {
    if (!value) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(value, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function truncateText(value, maxLength = 180) {
    if (!value) {
      return '';
    }

    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength).trimEnd()}...`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function extractFirstImage(html) {
    if (!html) {
      return '';
    }

    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : '';
  }

  function getNodeText(parent, selector) {
    const node = parent.getElementsByTagName(selector)[0];
    return node ? node.textContent.trim() : '';
  }

  function normalizeRssItem(item) {
    const rawTitle = getNodeText(item, 'title') || getNodeText(item, 'dc:title') || '';
    const title = cleanTitle(rawTitle);
    const link = getNodeText(item, 'link');
    const pubDate = getNodeText(item, 'pubDate');
    const descriptionHtml = getNodeText(item, 'description');
    const contentHtml = getNodeText(item, 'content:encoded');
    const mediaContent = item.getElementsByTagName('media:content')[0];
    const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
    const enclosure = item.getElementsByTagName('enclosure')[0];
    const image = mediaContent?.getAttribute('url') || mediaThumbnail?.getAttribute('url') || enclosure?.getAttribute('url') || extractFirstImage(contentHtml) || extractFirstImage(descriptionHtml);
    const rawExcerpt = stripHtml(descriptionHtml) || stripHtml(contentHtml);

    return {
      title,
      link,
      publishedAt: pubDate,
      excerpt: truncateText(rawExcerpt, 180),
      image
    };
  }

  function normalizeJsonItem(item) {
    const description = item.description || item.content || '';
    const image = item.thumbnail || extractFirstImage(item.content || '') || extractFirstImage(description);
    const title = cleanTitle(item.title || '');

    return {
      title: title,
      link: item.link || '',
      publishedAt: item.pubDate || item.published || '',
      excerpt: truncateText(stripHtml(description), 180),
      image
    };
  }

  function normalizeAtomEntry(entry) {
    const titleNode = entry.getElementsByTagName('title')[0];
    const linkNode = entry.getElementsByTagName('link')[0];
    const contentNode = entry.getElementsByTagName('content')[0] || entry.getElementsByTagName('summary')[0];
    const updatedNode = entry.getElementsByTagName('updated')[0] || entry.getElementsByTagName('published')[0];

    const title = titleNode ? cleanTitle(titleNode.textContent || '') : '';
    const link = linkNode ? linkNode.getAttribute('href') || linkNode.textContent.trim() : '';
    const publishedAt = updatedNode ? updatedNode.textContent.trim() : '';
    const descriptionHtml = contentNode ? contentNode.textContent || '' : '';
    const image = extractFirstImage(descriptionHtml) || '';
    const rawExcerpt = stripHtml(descriptionHtml);

    return {
      title,
      link,
      publishedAt,
      excerpt: truncateText(rawExcerpt, 180),
      image
    };
  }

  function cleanTitle(raw) {
    if (!raw) return '';
    // Decode any HTML and strip tags
    const decoded = stripHtml(raw);
    // Remove common Medium suffixes like "- Medium", "— Medium", "· Medium"
    const cleaned = decoded.replace(/\s*[-—–·]\s*Medium$/i, '').trim();
    return cleaned;
  }

  async function fetchDirectFeed() {
    // Append a cache-busting query param to slightly reduce stale responses
    const url = `${feedUrl}${feedUrl.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const response = await withTimeout(fetch(url), FETCH_TIMEOUT_MS, 'Direct Medium fetch timed out.');
    if (!response.ok) {
      throw new Error(`Medium feed request failed (${response.status})`);
    }

    const xmlText = await response.text();
    return parseFeedItems(xmlText);
  }
  async function fetchJsonFallback() {
    const response = await withTimeout(
      fetch(`${FALLBACK_JSON_API}${encodeURIComponent(feedUrl)}`),
      FETCH_TIMEOUT_MS,
      'JSON fallback timed out.'
    );
    if (!response.ok) {
      throw new Error(`Fallback feed request failed (${response.status})`);
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map(normalizeJsonItem);
  }

  async function fetchAllOriginsFallback() {
    // Use AllOrigins to avoid CORS and return raw XML which we can parse like the direct fetch
    const response = await withTimeout(
      fetch(`${ALLORIGINS_RAW}${encodeURIComponent(feedUrl)}&_=${Date.now()}`),
      FETCH_TIMEOUT_MS,
      'AllOrigins fallback timed out.'
    );
    if (!response.ok) {
      throw new Error(`AllOrigins request failed (${response.status})`);
    }

    const xmlText = await response.text();
    return parseFeedItems(xmlText);
  }

  function renderEmptyState(message) {
    gridEl.innerHTML = `
      <div class="blog-empty" style="grid-column: 1 / -1;">${message}</div>
    `;
  }

  function renderErrorState(message) {
    gridEl.innerHTML = `
      <div class="blog-error" style="grid-column: 1 / -1;">${message}</div>
    `;
  }

  function renderPosts(posts) {
    // Minimal rendering: titles only (clickable) as requested
    gridEl.innerHTML = posts.map((post) => {
      return `
        <article class="blog-card blog-card--title-only">
          <h3 class="blog-card__title"><a href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(post.title)}</a></h3>
          <div class="blog-card__meta">${escapeHtml(formatDate(post.publishedAt))}</div>
        </article>
      `;
    }).join('');
  }

  async function loadBlogPosts() {
    setStatus('Loading latest Medium articles...');
    renderSkeletons(postLimit);

    const cachedPosts = getCachedPosts();
    if (cachedPosts && cachedPosts.length) {
      renderPosts(cachedPosts.slice(0, postLimit));
      setStatus('Refreshing latest Medium articles...');
    }

    try {
      // Try all feed sources in parallel and aggregate their results. Using
      // Promise.any returned the first successful source but that source may
      // omit items other sources have. Aggregate from all sources, dedupe by
      // link, then sort by date so we show the most complete list possible.
      const sources = [fetchDirectFeed(), fetchAllOriginsFallback(), fetchJsonFallback()];
      const settled = await Promise.allSettled(sources);

      let allPosts = [];
      settled.forEach((r, i) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length) {
          allPosts = allPosts.concat(r.value);
        }
      });

      // Dedupe by link (some sources return the same posts)
      const seen = new Set();
      const deduped = [];
      allPosts.forEach((p) => {
        if (!p || !p.link) return;
        const key = p.link.trim();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(p);
        }
      });

      const publishedPosts = deduped.filter((post) => post.link && post.title);
      // Sort by published date (newest first) then take the top N
      publishedPosts.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      const visiblePosts = publishedPosts.slice(0, postLimit);

      if (!visiblePosts.length) {
        setStatus('No articles found.');
        renderEmptyState('No articles found in the Medium feed yet.');
        return;
      }

      // Don't display a summary line; keep the status area blank on success
      setStatus('');
      statusEl.classList.remove('is-error');
      setCachedPosts(visiblePosts);
      renderPosts(visiblePosts);
    } catch (error) {
      console.error('Medium blog load failed', error);
      if (cachedPosts && cachedPosts.length) {
        setStatus('Showing cached Medium articles.', 'error');
        renderPosts(cachedPosts.slice(0, postLimit));
        return;
      }

      setStatus('Unable to load Medium articles right now.', 'error');
      renderErrorState('Error loading Medium articles. Please try again later.');
    }
  }

  loadBlogPosts();
})();