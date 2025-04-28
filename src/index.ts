import { createTelegramClient, connectClient } from './client/telegram';
import { ChannelScraper } from './scrapers/channelScraper';
import config from './config/env';
import { Logger } from './utils/logger';
import { MessageData } from './models/message';
import { FileStorage } from './utils/fileStorage';

const logger = new Logger('Main');
const fileStorage = new FileStorage();

/**
 * Initialize Telegram client and connect
 */
async function initialize() {
  try {
    // Enable debug logging
    Logger.enableDebug(true);
    
    // Create and connect Telegram client
    const client = await createTelegramClient();
    await connectClient(client);
    
    // Create channel scraper
    const channelScraper = new ChannelScraper(client, config.targetChannel);
    
    // Get channel info to verify it exists
    const channelInfo = await channelScraper.getChannelInfo();
    if (!channelInfo) {
      logger.error(`Channel ${config.targetChannel} not found or is not accessible`);
      return;
    }
    
    logger.info(`Connected to channel: ${channelInfo.title}`);
    
    // Fetch messages with a specified limit
    const messages = await channelScraper.getMessages({ limit: 100 });
    
    // Print summary statistics
    printMessageStatistics(messages.messages);
    
    // Save messages to a file
    const savedFilePath = fileStorage.saveMessages(messages.messages, `${config.targetChannel}_initial`);
    logger.info(`Saved initial messages to: ${savedFilePath}`);
    
    // Start listening for new messages
    await listenForNewMessages(channelScraper);
    
    logger.info('Scraper is running. Press Ctrl+C to exit.');
  } catch (error) {
    logger.error('Initialization error', error as Error);
    process.exit(1);
  }
}

/**
 * Print statistics about scraped messages
 */
function printMessageStatistics(messages: MessageData[]) {
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

/**
 * Listen for new messages and handle them
 */
async function listenForNewMessages(scraper: ChannelScraper) {
  // Create an array to store new messages
  const newMessages: MessageData[] = [];
  
  // Set up message listener
  await scraper.listenForNewMessages((message) => {
    logger.info(`New message received: ${message.id}`);
    if (message.message_text) {
      const previewText = message.message_text.length > 50 
        ? message.message_text.substring(0, 50) + '...' 
        : message.message_text;
      logger.info(`Content: ${previewText}`);
    }
    
    newMessages.push(message);
    
    // Save messages to file when we have collected 10 new messages
    if (newMessages.length >= 10) {
      const savedFile = fileStorage.saveMessages(newMessages, `${config.targetChannel}_live`);
      logger.info(`Batch of ${newMessages.length} messages saved to: ${savedFile}`);
      newMessages.length = 0; // Clear the array
    }
  });
  
  // Set up an interval to save messages even if we don't reach 10
  setInterval(() => {
    if (newMessages.length > 0) {
      const savedFile = fileStorage.saveMessages(newMessages, `${config.targetChannel}_live`);
      logger.info(`Batch of ${newMessages.length} messages saved to: ${savedFile}`);
      newMessages.length = 0;
    }
  }, 60000); // Save every minute
}

// Start the application
initialize().catch(error => {
  logger.error('Fatal error', error);
  process.exit(1);
}); 