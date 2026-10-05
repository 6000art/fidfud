export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    success: true,
    runtime: 'vercel',
    node: process.version,
    time: new Date().toISOString()
  });
}
