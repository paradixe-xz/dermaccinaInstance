// src/config/index.ts
import dotenv from 'dotenv';
import path from 'path';
import { connectDB } from './database';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  tscApi: {
    token: process.env.TSC_API_TOKEN || '',
    url: process.env.TSC_API_URL || 'https://tsc-api-925835182876.us-east1.run.app/api/v1/2005060101'
  },
  elevenLabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    webhookSecret: process.env.ELEVENLABS_WEBHOOK_SECRET || ''
  },
  connectDB
};

export default config;