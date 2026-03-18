export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. PATH REDIRECTION (The "404 Killer")
    // If the browser asks for /assets/ or /js/ directly from the root,
    // we silently rewrite the request to look inside /macvg/ instead.
    if (!url.pathname.startsWith(basePath) && url.pathname !== "/") {
      const newPath = `${basePath}${url.pathname}`;
      // We rewrite the URL internally before fetching from 'env.ASSETS'
      url.pathname = newPath;
    }

    // 2. FORCED SUBFOLDER (UX)
    if (url.pathname === "/" || url.pathname === basePath) {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 3. FETCH FROM WORKER ASSETS
    // This looks for the file in your uploaded Worker/Pages bundle
    let response = await env.ASSETS.fetch(new Request(url, request));

    // 4. HTML REWRITING (DOM Injection)
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      response = new HTMLRewriter()
        .on("head", {
          element(element) {
            // Force the browser to resolve all relative links via /macvg/
            element.prepend(`<base href="${basePath}/">`, { html: true });
          },
        })
        .transform(response);
    }

    // 5. ADD COMPATIBILITY HEADERS
    // Many MacVG games (Unity/Godot) require these to avoid crashes
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
