export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const basePath = "/macvg";

    // 1. Redirect actual root visits to the main page
    if (url.pathname === "/" || url.pathname === "") {
      return Response.redirect(`${url.origin}${basePath}/`, 301);
    }

    // 2. THE FIX: Rewrite requests starting with / to look in /macvg/
    // If the browser asks for "/games.css", we change it to "/macvg/games.css"
    // but only if it doesn't already start with /macvg
    let internalPath = url.pathname;
    if (!internalPath.startsWith(basePath)) {
      internalPath = `${basePath}${internalPath}`;
    }

    // Create a new URL for the internal asset fetch
    const assetUrl = new URL(url.toString());
    assetUrl.pathname = internalPath;

    // 3. Fetch from your Worker's bundled assets
    let response = await env.ASSETS.fetch(new Request(assetUrl, request));

    // 4. Handle HTML and Inject <base> 
    // This tells the browser "all your relative links belong to /macvg/"
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      response = new HTMLRewriter()
        .on("head", {
          element(element) {
            element.prepend(`<base href="${basePath}/">`, { html: true });
          },
        })
        .transform(response);
    }

    // 5. Apply Game-Required Headers
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    // Critical for heavy browser games
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return new Response(response.body, {
      status: response.status,
      headers: headers,
    });
  },
};
