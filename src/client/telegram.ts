import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '../utils/logger';
import config from '../config/env';

const logger = new Logger('TelegramClient');

/**
 * Create and configure a Telegram client
 * @param sessionData Optional string data for an existing session
 * @returns An initialized TelegramClient instance
 */
export const createTelegramClient = async (sessionData?: string): Promise<TelegramClient> => {
  try {
    // Initialize session
    const stringSession = new StringSession(sessionData || '');
    
    // Create client with API credentials
    const client = new TelegramClient(
      stringSession,
      config.apiId,
      config.apiHash,
      {
        connectionRetries: 5,
      }
    );

    logger.info('Telegram client created');
    return client;
  } catch (error) {
    logger.error('Failed to create Telegram client', error as Error);
    throw error;
  }
};

/**
 * Connect to Telegram and handle authentication
 * @param client Telegram client to connect
 */
export const connectClient = async (client: TelegramClient): Promise<void> => {
  try {
    logger.info('Connecting to Telegram...');
    await client.connect();
    
    // Check if user is already logged in
    if (!await client.checkAuthorization()) {
      logger.info('User not authorized, please login');
      await client.start({
        phoneNumber: async () => await prompt('Please enter your phone number: '),
        password: async () => await prompt('Please enter your password: '),
        phoneCode: async () => await prompt('Please enter the code you received: '),
        onError: (err) => logger.error('Error during login', err),
      });
      
      // Save the session for future use
      logger.info(`Session saved: ${client.session.save()}`);
    } else {
      logger.info('User already authorized');
    }
    
    logger.info('Successfully connected to Telegram');
  } catch (error) {
    logger.error('Error connecting to Telegram', error as Error);
    throw error;
  }
};

/**
 * Simple prompt function for command line input
 */
async function prompt(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

export default {
  createTelegramClient,
  connectClient,
}; 