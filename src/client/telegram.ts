import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Logger } from '../utils/logger';
import config from '../config/env';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const logger = new Logger('TelegramClient');
const SESSION_FILE_PATH = join(process.cwd(), `${config.sessionName}.session`);

/**
 * Load session data from file if it exists
 * @returns Session data as string or empty string if not found
 */
export const loadSessionFromFile = (): string => {
  try {
    if (existsSync(SESSION_FILE_PATH)) {
      logger.info(`Loading session from: ${SESSION_FILE_PATH}`);
      const data = readFileSync(SESSION_FILE_PATH, 'utf8');
      if (!data || data === '[object Object]') {
        logger.error('Invalid session data in file');
        return '';
      }
      return data;
    }
  } catch (error) {
    logger.error('Failed to load session file', error as Error);
  }
  return '';
};

/**
 * Save session data to file
 * @param sessionData Session data as string
 */
export const saveSessionToFile = (sessionData: string): void => {
  try {
    if (!sessionData || sessionData === '[object Object]') {
      logger.error('Invalid session data, not saving');
      return;
    }
    logger.info(`Saving session to: ${SESSION_FILE_PATH}`);
    writeFileSync(SESSION_FILE_PATH, sessionData);
  } catch (error) {
    logger.error('Failed to save session file', error as Error);
  }
};

/**
 * Create and configure a Telegram client
 * @returns An initialized TelegramClient instance
 */
export const createTelegramClient = async (): Promise<TelegramClient> => {
  try {
    // Load existing session if available
    const sessionData = loadSessionFromFile();
    
    // Initialize session
    const stringSession = new StringSession(sessionData);
    
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
      
      // Get the string session
      const session = client.session as StringSession;
      if (session) {
        const sessionData = session.save();
        logger.info('Got session string: ' + (sessionData ? 'valid string' : 'invalid'));
        if (sessionData) {
          saveSessionToFile(sessionData);
          logger.info('Session saved to file');
        }
      } else {
        logger.error('Failed to get session data');
      }
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