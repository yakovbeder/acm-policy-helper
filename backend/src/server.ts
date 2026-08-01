import { app } from './app.js';
import { logger } from './logger.js';

const port = Number(process.env.PORT || 8080);

const server = app.listen(port, () => {
  logger.info({ port }, 'ACM Policy Helper listening');
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
