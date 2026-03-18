export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. Force the user into the /macvg/ subfolder
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 2. PATH MAPPING
    // If the browser asks for "/macvg/style.css", 
    // we need to look for "/style.css" in your GitHub repo files.
    let targetPath = url.pathname;
    if (targetPath.startsWith(basePath)) {
      targetPath = targetPath.replace(basePath, "");
    }
    
    // If the path becomes empty after removing /macvg, default to index.html
    if (targetPath === "/" || targetPath === "") {
      targetPath = "/index.html";
    }

    // 3. FETCH FROM ASSETS
    // We create a new request pointing to the root of your repo's build
    const assetUrl = new URL(url.toString());
    assetUrl.pathname = targetPath;
    
    let response = await env.ASSETS.fetch(new Request(assetUrl, request));

    // 4. HTML REWRITER (Fixes internal links)
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return new HTMLRewriter()
        .on("head", {
          element(element) {
            // This is the "glue" that keeps the app running in a subfolder
            element.prepend(`<base href="${basePath}/">`, { html: true });
          },
        })
        .transform(response);
    }

    // 5. HEADERS FOR GAMES
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
