import { createTelegramClient, connectClient } from './client/telegram';
import { ChannelScraper } from './scrapers/channelScraper';
import config from './config/env';
import { Logger } from './utils/logger';
import { MessageData } from './models/message';
import { FileStorage } from './utils/fileStorage';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('Scraper');
const fileStorage = new FileStorage();

/**
 * Main function to scrape Telegram channel and return results if using nestjs
 * @returns Promise with scraped MessageData array
 */
export async function scrapeTelegramChannel(): Promise<MessageData[]> {
  try {
    // Enable debug logging
    Logger.enableDebug(true);
    
    logger.info('Starting Telegram scraper');
    
    // Create and connect Telegram client
    const client = await createTelegramClient();
    await connectClient(client);
    
    // Create channel scraper
    const channelScraper = new ChannelScraper(client, config.targetChannel);
    
    // Get channel info to verify it exists
    const channelInfo = await channelScraper.getChannelInfo();
    if (!channelInfo) {
      throw new Error(`Channel ${config.targetChannel} not found or is not accessible`);
    }
    
    logger.info(`Connected to channel: ${channelInfo.title}`);
    
    // Fetch messages with a specified limit
    const messages = await channelScraper.getMessages({ limit: 100 });
    
    // Print summary statistics
    logMessageStatistics(messages.messages);
    
    // Save messages to a file for backup/debugging
    const savedFilePath = fileStorage.saveMessages(messages.messages, `${config.targetChannel}_direct`);
    logger.info(`Saved messages to: ${savedFilePath}`);
    
    // If OUTPUT_FILE environment variable is set, write the data to this file as well
    // This is used when called from the adapter service
    if (process.env.OUTPUT_FILE) {
      logger.info(`Writing output to adapter-specified file: ${process.env.OUTPUT_FILE}`);
      fs.writeFileSync(process.env.OUTPUT_FILE, JSON.stringify(messages.messages));
    }
    
    return messages.messages;
  } catch (error) {
    logger.error('Scraper error', error as Error);
    throw error;
  }
}

/**
 * Log statistics about scraped messages
 */
function logMessageStatistics(messages: MessageData[]) {
  if (messages.length === 0) {
    logger.info('No messages found');
    return;
  }
  
  const withText = messages.filter(m => m.message_text.trim() !== '').length;
  const withPhotos = messages.filter(m => m.message_photo.length > 0).length;
  const withVideos = messages.filter(m => m.message_video.length > 0).length;
  const withoutContent = messages.filter(
    m => m.message_text.trim() === '' && 
    m.message_photo.length === 0 && 
    m.message_video.length === 0
  ).length;
  
  logger.info('--- Message Statistics ---');
  logger.info(`Total messages: ${messages.length}`);
  logger.info(`Messages with text: ${withText} (${Math.round(withText/messages.length*100)}%)`);
  logger.info(`Messages with photos: ${withPhotos} (${Math.round(withPhotos/messages.length*100)}%)`);
  logger.info(`Messages with videos: ${withVideos} (${Math.round(withVideos/messages.length*100)}%)`);
  logger.info(`Messages without content: ${withoutContent} (${Math.round(withoutContent/messages.length*100)}%)`);
  
  // List some sample messages with text
  const textMessages = messages
    .filter(m => m.message_text.trim() !== '')
    .slice(0, 3);
  
  if (textMessages.length > 0) {
    logger.info('--- Sample Messages ---');
    textMessages.forEach((msg, i) => {
      const previewText = msg.message_text.length > 70 
        ? msg.message_text.substring(0, 70) + '...' 
        : msg.message_text;
      logger.info(`[${i+1}] ${previewText}`);
    });
  }
  
  logger.info('------------------------');
}

// If this file is run directly, execute the scraper and exit
if (require.main === module) {
  scrapeTelegramChannel()
    .then(() => {
      logger.info('Scraper completed successfully');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Fatal error', error);
      process.exit(1);
    });
} 