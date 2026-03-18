export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. Redirect root to /macvg/
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 2. Try to fetch the request exactly as it is first
    let response = await env.ASSETS.fetch(request.clone());

    // 3. THE MAGIC FIX: If the file is 404, look for it inside /macvg/
    // This catches "games.css" and turns it into "/macvg/games.css" internally
    if (response.status === 404 && !url.pathname.startsWith(basePath)) {
      const fallbackUrl = new URL(url.toString());
      fallbackUrl.pathname = `${basePath}${url.pathname}`;
      response = await env.ASSETS.fetch(new Request(fallbackUrl, request));
    }

    // 4. Inject <base> and Fix Content
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      response = new HTMLRewriter()
        .on("head", {
          element(element) {
            // This ensures any relative paths are based on the /macvg/ folder
            element.prepend(`<base href="${basePath}/">`, { html: true });
          },
        })
        // Optional: If there are hardcoded "kbsigmaboy67.github.io" links, 
        // we swap them to your current domain on the fly
        .on("a", {
            element(element) {
                const href = element.getAttribute("href");
                if (href && href.includes("kbsigmaboy67.github.io")) {
                    element.setAttribute("href", href.replace("https://kbsigmaboy67.github.io/macvg", basePath));
                }
            }
        })
        .transform(response);
    }

    // 5. Global Headers (CORS & Security for Games)
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    
    // These two are CRITICAL for MacVG game engines to run without errors
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });
  },
};
