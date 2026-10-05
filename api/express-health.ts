import express from 'express';

const app = express();

app.get('/api/express-health', (_req, res) => {
  res.status(200).json({
    success: true,
    express: true,
    node: process.version
  });
});

export default app;
