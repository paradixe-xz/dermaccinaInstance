import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from './config';
import routes from './router';
import { logger } from './middlewares/logger';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Logs
app.use(logger);

// Routes
app.get('/', (req, res) => {
  res.send('¡Hola! El servidor está funcionando correctamente.');
});
app.use('/api', routes);

// Error handler
app.use(errorHandler);

// Start server
config.connectDB()
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📱 Environment: ${config.nodeEnv}`);
      console.log(`🌐 API available at: http://localhost:${config.port}/api`);
    });
  })
  .catch((err: any) => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });

export default app;