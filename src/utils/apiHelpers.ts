/**
 * Helper to safely parse API responses in the frontend.
 * Protects against HTML error responses, timeouts, 500 errors, or empty bodies
 * that would otherwise trigger "Unexpected token < in JSON at position 0".
 */

export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export async function safeApiJson<T = any>(
  res: Response,
  endpointLabel: string = 'Requête API'
): Promise<SafeApiResponse<T>> {
  let rawText = '';
  try {
    rawText = await res.text();
  } catch (err: any) {
    return {
      ok: false,
      status: res.status,
      error: `Erreur ${endpointLabel}\nHTTP ${res.status}\nImpossible de lire la réponse du serveur: ${err?.message || 'Erreur réseau'}`
    };
  }

  if (!rawText || !rawText.trim()) {
    return {
      ok: false,
      status: res.status,
      error: `Erreur ${endpointLabel}\nHTTP ${res.status}\nLe serveur a retourné une réponse vide.`
    };
  }

  // Try parsing JSON safely
  try {
    const parsed = JSON.parse(rawText);
    if (!res.ok) {
      const message = parsed.error || parsed.message || `Erreur serveur HTTP ${res.status}`;
      return {
        ok: false,
        status: res.status,
        data: parsed,
        error: `Erreur ${endpointLabel}\nHTTP ${res.status}\n${message}`
      };
    }
    return {
      ok: true,
      status: res.status,
      data: parsed
    };
  } catch {
    // Non-JSON response (e.g. Vercel 504 Gateway Timeout, 500 Serverless Crash HTML, 404 HTML)
    const cleanSnippet = rawText
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    return {
      ok: false,
      status: res.status,
      error: `Erreur ${endpointLabel}\nHTTP ${res.status}\n${cleanSnippet || 'Le serveur a renvoyé un contenu non-JSON (HTML ou erreur serveur Vercel).'}`
    };
  }
}
