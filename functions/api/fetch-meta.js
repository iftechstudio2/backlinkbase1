export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  let parsed;
  try {
    parsed = new URL(targetUrl.startsWith("http") ? targetUrl : "https://" + targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const hostname = parsed.hostname.toLowerCase();
  const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; BacklinkBaseBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      redirect: "follow"
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return new Response(JSON.stringify({
        title: hostname,
        description: "",
        logo_url: defaultFavicon,
        domain: hostname
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    const reader = res.body.getReader();
    let html = "";
    let bytesRead = 0;
    const decoder = new TextDecoder();

    while (bytesRead < 250000) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      bytesRead += value.length;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    const getTagContent = (regex) => {
      const match = html.match(regex);
      return match ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : "";
    };

    const ogTitle = getTagContent(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                    getTagContent(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    const docTitle = getTagContent(/<title[^>]*>([^<]+)<\/title>/i);
    const title = ogTitle || docTitle || hostname;

    const ogDesc = getTagContent(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
                   getTagContent(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    const metaDesc = getTagContent(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                     getTagContent(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = ogDesc || metaDesc || "";

    const ogImage = getTagContent(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                    getTagContent(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    let logo_url = defaultFavicon;
    if (ogImage) {
      try {
        logo_url = new URL(ogImage, parsed.origin).toString();
      } catch {}
    }

    return new Response(JSON.stringify({
      title,
      description,
      logo_url,
      domain: hostname
    }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      title: hostname,
      description: "",
      logo_url: defaultFavicon,
      domain: hostname
    }), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
