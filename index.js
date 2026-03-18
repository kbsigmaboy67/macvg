export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. Redirect root "/" to "/macvg/"
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 2. SMART ROUTING
    // We create a list of paths to try. 
    // First, try exactly what the browser asked for.
    // Second, if the browser asked for the root, try the /macvg/ subfolder.
    let pathsToTry = [url.pathname];
    
    if (!url.pathname.startsWith(basePath)) {
      pathsToTry.push(`${basePath}${url.pathname}`);
    }

    let response;
    for (const path of pathsToTry) {
      const assetUrl = new URL(url.toString());
      assetUrl.pathname = path;
      response = await env.ASSETS.fetch(new Request(assetUrl, request));
      
      if (response.status !== 404) break; 
    }

    // 3. HTML REWRITING
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      response = new HTMLRewriter()
        .on("head", {
          element(element) {
            // We inject the <base> tag but we use the actual domain root
            // to ensure absolute / paths and relative paths both resolve.
            element.prepend(`<base href="${basePath}/">`, { html: true });
          },
        })
        .transform(response);
    }

    // 4. ESSENTIAL HEADERS (The "Game Fixer" Headers)
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    
    // These allow the high-performance JS engines in MacVG to work
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    // Remove any security headers that might block scripts from loading
    headers.delete("Content-Security-Policy");

    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });
  },
};
