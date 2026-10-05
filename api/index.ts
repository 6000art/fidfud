let cachedApp: any = null;

export default async function handler(req: any, res: any) {
  try {
    if (!cachedApp) {
      console.log('[API BOOT] Loading FIDFUD backend...');

      let serverModule: any = null;
      let lastErr: any = null;

      try {
        serverModule = await import('../server.js');
      } catch (err: any) {
        lastErr = err;
        console.warn('[API BOOT] Could not load ../server.js, trying ../server:', err?.message);
        try {
          serverModule = await import('../server');
        } catch (srcErr: any) {
          console.warn('[API BOOT] Could not load ../server either:', srcErr?.message);
          throw lastErr || srcErr;
        }
      }

      cachedApp = serverModule?.default || serverModule?.app;

      if (!cachedApp) {
        throw new Error('server module loaded but no Express app was exported');
      }

      console.log('[API BOOT] FIDFUD backend loaded successfully');
    }

    return cachedApp(req, res);

  } catch (error: any) {
    console.error('[API BOOT FAILED]', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack
    });

    if (!res.headersSent) {
      const rawMsg = error?.message || 'Unknown backend boot error';
      // Sanitize any secrets/keys from error message before returning
      const cleanMsg = rawMsg
        .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
        .replace(/-----BEGIN PRIVATE KEY-----[^-]+-----END PRIVATE KEY-----/gs, '[REDACTED_PRIVATE_KEY]')
        .replace(/(bearer|key|token|secret|password)[:=\s]+[^\s,;&]+/gi, '$1: [REDACTED]');

      return res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_BOOT_FAILED',
          name: error?.name || 'Error',
          message: cleanMsg,
          runtime: 'vercel'
        }
      });
    }
  }
}
