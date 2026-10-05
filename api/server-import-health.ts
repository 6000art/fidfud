export default async function handler(req: any, res: any) {
  try {
    const startedAt = Date.now();

    const mod = await import('../server.js');

    return res.status(200).json({
      success: true,
      serverImported: true,
      hasDefaultExport: Boolean(mod.default),
      hasAppExport: Boolean(mod.app),
      durationMs: Date.now() - startedAt,
      node: process.version
    });

  } catch (error: any) {
    console.error('[SERVER IMPORT TEST FAILED]', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      stack: error?.stack
    });

    const rawMsg = error?.message || 'Unknown import error';
    const cleanMsg = rawMsg
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/-----BEGIN PRIVATE KEY-----[^-]+-----END PRIVATE KEY-----/gs, '[REDACTED_PRIVATE_KEY]')
      .replace(/(bearer|key|token|secret|password)[:=\s]+[^\s,;&]+/gi, '$1: [REDACTED]');

    return res.status(500).json({
      success: false,
      serverImported: false,
      errorName: error?.name || 'Error',
      errorCode: error?.code || null,
      errorMessage: cleanMsg,
      node: process.version
    });
  }
}
