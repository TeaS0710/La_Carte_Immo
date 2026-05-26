/**
 * Middleware Cloudflare Pages — protection HTTP Basic Auth.
 *
 * Comportement :
 *   - Bloque toute requête sans en-tête Authorization valide
 *   - Username / password lus depuis les env vars CF Pages :
 *       BASIC_AUTH_USER   (par défaut : "prelys")
 *       BASIC_AUTH_PASS   (obligatoire — sinon 503 d'erreur de config)
 *   - 401 + WWW-Authenticate sinon → le browser affiche le popup natif
 *   - Une fois authentifié, sert le static asset normalement
 *
 * Pour modifier le mot de passe :
 *   wrangler pages secret put BASIC_AUTH_PASS --project-name=la-carte-immo
 *
 * Pour désactiver complètement la protection :
 *   wrangler pages secret put PUBLIC_ACCESS --project-name=la-carte-immo
 *   (saisir la valeur "true")
 */

interface Env {
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASS?: string;
  PUBLIC_ACCESS?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, next, env }) => {
  // Bypass total si PUBLIC_ACCESS=true (kill switch côté admin)
  if (env.PUBLIC_ACCESS === "true") {
    return next();
  }

  // Config invalide : pas de password défini → on refuse pour éviter d'exposer
  if (!env.BASIC_AUTH_PASS) {
    return new Response(
      "La protection est activée mais BASIC_AUTH_PASS n'est pas configuré côté serveur. Contactez l'administrateur.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  const expectedUser = env.BASIC_AUTH_USER ?? "prelys";
  const expectedPass = env.BASIC_AUTH_PASS;

  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(":");
      const u = idx >= 0 ? decoded.slice(0, idx) : "";
      const p = idx >= 0 ? decoded.slice(idx + 1) : "";
      if (safeEq(u, expectedUser) && safeEq(p, expectedPass)) {
        return next();
      }
    } catch {
      // base64 invalide → fall through au 401
    }
  }

  return new Response("Authentification requise", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="La Carte Prelys — accès partenaire", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      // Empêche la mise en cache des réponses non-authentifiées par les
      // intermédiaires CDN
      "Cache-Control": "no-store",
    },
  });
};

// Comparaison à temps constant pour éviter timing attacks
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
