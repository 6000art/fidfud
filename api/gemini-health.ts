import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  const rawKey = process.env.GEMINI_API_KEY;
  const keyPresent = Boolean(rawKey && rawKey.trim().length > 0);

  if (!keyPresent) {
    return res.status(200).json({
      success: false,
      keyPresent: false,
      geminiOperational: false,
      errorCode: 'MISSING_KEY',
      errorMessage: 'La variable d\'environnement GEMINI_API_KEY est absente.'
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: rawKey!.trim() });

    // Quick test ping with the primary supported model gemini-3.8-flash
    let result;
    try {
      result = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'ping'
      });
    } catch (primaryErr: any) {
      // If primary model has an issue, attempt standard fallback gemini-2.5-flash
      const primaryMsg = primaryErr?.message || '';
      if (primaryMsg.includes('not found') || primaryErr?.status === 404) {
        result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'ping'
        });
      } else {
        throw primaryErr;
      }
    }

    if (!result || !result.text) {
      return res.status(200).json({
        success: false,
        keyPresent: true,
        geminiOperational: false,
        errorCode: 'SERVICE_UNAVAILABLE',
        errorMessage: 'Réponse vide reçue du service Gemini.'
      });
    }

    return res.status(200).json({
      success: true,
      keyPresent: true,
      geminiOperational: true
    });
  } catch (error: any) {
    const status = error?.status || error?.statusCode || 0;
    const rawMsg = error?.message || String(error) || '';
    const cleanMsg = rawMsg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
    const lower = cleanMsg.toLowerCase();

    let errorCode = 'SERVICE_UNAVAILABLE';

    if (
      status === 400 ||
      lower.includes('api_key_invalid') ||
      lower.includes('invalid api key') ||
      lower.includes('api key not valid') ||
      lower.includes('forbidden')
    ) {
      errorCode = 'INVALID_KEY';
    } else if (
      status === 429 ||
      lower.includes('resource_exhausted') ||
      lower.includes('quota') ||
      lower.includes('rate limit') ||
      lower.includes('too many requests')
    ) {
      errorCode = lower.includes('quota') ? 'QUOTA_EXCEEDED' : 'RATE_LIMITED';
    } else if (
      status === 404 ||
      lower.includes('model not found') ||
      lower.includes('not_found') ||
      lower.includes('is not found')
    ) {
      errorCode = 'MODEL_NOT_FOUND';
    }

    return res.status(200).json({
      success: false,
      keyPresent: true,
      geminiOperational: false,
      errorCode,
      errorMessage: cleanMsg
    });
  }
}
