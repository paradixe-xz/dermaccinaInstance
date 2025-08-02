import dotenv from 'dotenv';
import { connectMongo } from './database';

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  passGet: process.env.PASS_GET,
  tscApi: {
    url: process.env.TSC_API_URL!,
    token: process.env.TSC_API_TOKEN!
  },
  mongoUri: process.env.MONGO_URI,
  connectMongo
};