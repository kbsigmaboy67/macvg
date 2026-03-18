export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Try the request exactly as the browser asked
    let response = await env.ASSETS.fetch(request.clone());

    // 2. THE FIX: If 404, try to find the file name at the ROOT
    // Example: if browser asks for /macvg/app.js and it's not there,
    // this will try to find just /app.js
    if (response.status === 404) {
      const parts = url.pathname.split('/');
      const fileName = parts[parts.length - 1]; // Get just "app.js"
      
      if (fileName && fileName.includes('.')) {
        const rootUrl = new URL(`/${fileName}`, url.origin);
        const secondAttempt = await env.ASSETS.fetch(new Request(rootUrl, request));
        
        if (secondAttempt.ok) {
          response = secondAttempt;
        }
      }
    }

    // 3. Handle the HTML specifically
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      return new HTMLRewriter()
        .on("head", {
          element(element) {
            // Remove any existing <base> tags that might be causing issues
            // and inject a neutral one.
            element.append(`<base href="/">`, { html: true });
          },
        })
        .transform(response);
    }

    // 4. Critical headers for Game Engines
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });
  },
};
