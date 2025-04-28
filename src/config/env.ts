import dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables from .env file
dotenv.config();

// Environment variables configuration
export const config = {
  apiId: parseInt(process.env.API_ID || '25832642', 10),
  apiHash: process.env.API_HASH || '90d373d28032d3c1c5959889f55a0238',
  sessionName: process.env.SESSION_NAME || 'telegram-scraper',
  targetChannel: process.env.TARGET_CHANNEL || 'arendabatumi',
};

// Validate required configuration
const validateConfig = () => {
  const { apiId, apiHash, targetChannel } = config;
  
  if (!apiId) {
    throw new Error('API_ID is required in environment variables');
  }
  
  if (!apiHash) {
    throw new Error('API_HASH is required in environment variables');
  }
  
  if (!targetChannel) {
    throw new Error('TARGET_CHANNEL is required in environment variables');
  }
};

// Run validation
validateConfig();

export default config; 