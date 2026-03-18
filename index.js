export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. Force Root to /macvg/
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 2. THE PATH STRIPPER
    // If browser asks for /macvg/games.css OR /games.css,
    // we look for /games.css in your repo root.
    let resourcePath = url.pathname;
    if (resourcePath.startsWith(basePath)) {
      resourcePath = resourcePath.replace(basePath, "");
    }
    if (resourcePath === "/" || resourcePath === "") {
      resourcePath = "/index.html";
    }

    // 3. FETCH THE ASSET
    const assetUrl = new URL(url.toString());
    assetUrl.pathname = resourcePath;
    
    let response = await env.ASSETS.fetch(new Request(assetUrl, request));

    // 4. THE CONTENT FIXER
    if (response.status === 200) {
      const contentType = response.headers.get("content-type") || "";
      
      if (contentType.includes("text/html")) {
        // Rewrite the HTML to fix those 404s
        return new HTMLRewriter()
          .on("head", {
            element(element) {
              // This fixes the 'app.js' and 'games.css' 404s
              element.prepend(`<base href="${basePath}/">`, { html: true });
            },
          })
          .on("img", {
            element(element) {
              // Fixes logos that might have leading slashes
              const src = element.getAttribute("src");
              if (src && src.startsWith("/")) {
                element.setAttribute("src", `${basePath}${src}`);
              }
            }
          })
          .transform(response);
      }
    }

    // 5. SECURITY & GAME HEADERS (Fixes "ReferenceError" and 403-like blocks)
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
    
    // Some ad-blockers or security settings cause 403s on scripts. 
    // This helps bypass some of those domain-based blocks.
    newHeaders.delete("X-Frame-Options"); 

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  },
};
