import { TelegramClient } from 'telegram';
import { NewMessage } from 'telegram/events';
import { Api } from 'telegram/tl';
import { Logger } from '../utils/logger';
import { MessageData, MessageBatch, ScraperOptions } from '../models/message';

const logger = new Logger('ChannelScraper');

/**
 * Class responsible for scraping messages from a Telegram channel
 */
export class ChannelScraper {
  private client: TelegramClient;
  private channelName: string;

  constructor(client: TelegramClient, channelName: string) {
    this.client = client;
    this.channelName = channelName;
  }

  /**
   * Get basic channel information
   * @returns Channel entity
   */
  async getChannelInfo(): Promise<Api.Channel | null> {
    try {
      logger.info(`Retrieving channel info for: ${this.channelName}`);
      const entity = await this.client.getEntity(this.channelName) as Api.Channel;
      
      if (!entity || !(entity instanceof Api.Channel)) {
        logger.error(`${this.channelName} is not a valid channel`);
        return null;
      }
      
      logger.info(`Channel found: ${entity.title}, id: ${entity.id}`);
      return entity;
    } catch (error) {
      logger.error('Failed to get channel info', error as Error);
      return null;
    }
  }

  /**
   * Fetch messages from the channel
   * @param options Scraper options
   * @returns A batch of messages
   */
  async getMessages(options: ScraperOptions = {}): Promise<MessageBatch> {
    try {
      const {
        limit = 100,
        offsetId = 0,
        minId = 0,
        maxId = 0,
        fromDate,
        toDate,
      } = options;

      logger.info(`Fetching messages from ${this.channelName} with limit: ${limit}`);
      
      // Get channel entity
      const channel = await this.getChannelInfo();
      if (!channel) {
        throw new Error(`Could not find channel: ${this.channelName}`);
      }

      // Fetch messages from the channel
      const messages = await this.client.getMessages(channel, {
        limit,
        offsetId,
        minId,
        maxId,
      });

      // Process messages into our structured format
      const processedMessages: MessageData[] = [];
      
      for (const msg of messages) {
        try {
          const processedMsg = await this.processMessage(msg, channel);
          processedMessages.push(processedMsg);
        } catch (error) {
          logger.error(`Error processing message ${msg.id}`, error as Error);
        }
      }
      
      // Filter by date if specified
      const filteredMessages = processedMessages.filter(msg => {
        if (!msg.datetime) return true;
        
        const msgDate = new Date(msg.datetime);
        if (fromDate && msgDate < fromDate) return false;
        if (toDate && msgDate > toDate) return false;
        return true;
      });

      logger.info(`Retrieved ${filteredMessages.length} messages from ${this.channelName}`);
      
      return {
        channelName: this.channelName,
        messages: filteredMessages,
        totalCount: filteredMessages.length,
        batchTimestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error fetching messages', error as Error);
      throw error;
    }
  }

  /**
   * Process a message into our structured format
   * @param message Telegram message
   * @param channel Channel entity
   * @returns Structured message data
   */
  private async processMessage(message: Api.Message, channel: Api.Channel): Promise<MessageData> {
    try {
      // Get chat info
      const senderInfo = await this.getSenderInfo(message, channel);
      
      // Extract message photos
      const photos: string[] = [];
      const videos: string[] = [];
      let mediaCaption = "";
      
      if (message.media) {
        logger.debug(`Processing media in message ${message.id}`);
        
        if (message.media instanceof Api.MessageMediaPhoto && message.media.photo) {
          // Handle photos
          const photo = message.media.photo;
          
          // Extract caption from photo if available
          if ('caption' in message.media && message.media.caption) {
            mediaCaption = message.media.caption as string;
            logger.debug(`Found photo caption: ${mediaCaption.substring(0, 30)}...`);
          }
          
          if ('sizes' in photo) {
            // Find largest size
            for (const size of photo.sizes) {
              if (size instanceof Api.PhotoSize || size instanceof Api.PhotoCachedSize) {
                const fileLocation = `https://t.me/${this.channelName}/${message.id}?single&photo=${size.type}`;
                photos.push(fileLocation);
                logger.debug(`Added photo URL: ${fileLocation}`);
                break;
              }
            }
          }
        } else if (message.media instanceof Api.MessageMediaDocument && message.media.document) {
          // Handle videos
          const document = message.media.document;
          
          // Extract caption from document if available
          if ('caption' in message.media && message.media.caption) {
            mediaCaption = message.media.caption as string;
            logger.debug(`Found document caption: ${mediaCaption.substring(0, 30)}...`);
          }
          
          if ('mimeType' in document && document.mimeType && document.mimeType.startsWith('video/')) {
            const fileLocation = `https://t.me/${this.channelName}/${message.id}?single`;
            videos.push(fileLocation);
            logger.debug(`Added video URL: ${fileLocation}`);
          }
        } else if (message.media instanceof Api.MessageMediaWebPage && message.media.webpage) {
          // Handle web pages
          const webpage = message.media.webpage;
          let webpageInfo = '';
          
          if ('title' in webpage && webpage.title) {
            webpageInfo += `Title: ${webpage.title}\n`;
          }
          
          if ('description' in webpage && webpage.description) {
            webpageInfo += `Description: ${webpage.description}\n`;
          }
          
          if ('url' in webpage && webpage.url) {
            webpageInfo += `URL: ${webpage.url}`;
          }
          
          if (webpageInfo) {
            mediaCaption = webpageInfo;
            logger.debug(`Extracted webpage info: ${webpageInfo.substring(0, 30)}...`);
          }
        }
      }
      
      // Create data_post from channel name and message id
      const dataPost = `${this.channelName}/${message.id}`;
      
      // Create message URL
      const messageUrl = `https://t.me/${this.channelName}/${message.id}`;

      // Format date to ISO string
      const datetime = new Date(message.date * 1000).toISOString();
      
      // Combine message text with media caption if message text is empty
      let messageText = message.message || "";
      if (!messageText && mediaCaption) {
        messageText = `[Media Caption] ${mediaCaption}`;
      } else if (!messageText && (photos.length > 0 || videos.length > 0)) {
        messageText = photos.length > 0 
          ? `[Photo message without text, ${photos.length} photo(s)]` 
          : `[Video message without text]`;
      }
      
      // Create structured message
      const result: MessageData = {
        data_post: dataPost,
        user_url: `https://t.me/${this.channelName}`,
        user_name: senderInfo.name,
        user_photo: senderInfo.photo,
        message_url: messageUrl,
        message_text: messageText,
        message_photo: photos,
        message_video: videos,
        views: message.views?.toString() || "0",
        datetime: datetime,
        id: message.id
      };

      logger.info(`Processed message ${message.id}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`);
      
      return result;
    } catch (error) {
      logger.error(`Error processing message ${message.id}`, error as Error);
      
      // Return a basic structure even if there's an error
      return {
        data_post: `${this.channelName}/${message.id}`,
        user_url: `https://t.me/${this.channelName}`,
        user_name: this.channelName,
        message_url: `https://t.me/${this.channelName}/${message.id}`,
        message_text: `[Error processing message content]`,
        message_photo: [],
        message_video: [],
        datetime: new Date(message.date * 1000).toISOString(),
        id: message.id
      };
    }
  }
  
  /**
   * Get sender information for a message
   */
  private async getSenderInfo(message: Api.Message, channel: Api.Channel): Promise<{name: string, photo?: string}> {
    try {
      // For channel messages, use channel info
      return {
        name: channel.title || this.channelName,
        photo: `https://t.me/${this.channelName}/profile-photo`
      };
    } catch (error) {
      logger.error('Error getting sender info', error as Error);
      return {
        name: this.channelName
      };
    }
  }

  /**
   * Listen for new messages in the channel
   * @param callback Function to call when a new message is received
   * @returns Event handler that can be used to remove the listener
   */
  async listenForNewMessages(callback: (message: MessageData) => void) {
    try {
      logger.info(`Starting to listen for new messages in ${this.channelName}`);
      
      // Get channel entity
      const channel = await this.getChannelInfo();
      if (!channel) {
        throw new Error(`Could not find channel: ${this.channelName}`);
      }

      // Set up event handler for new messages
      const eventHandler = this.client.addEventHandler(async (event) => {
        const message = event.message;
        // Check if the message is from our target channel
        if (message.peerId && 'channelId' in message.peerId && 
            message.peerId.channelId === channel.id) {
          try {
            const processedMessage = await this.processMessage(message, channel);
            callback(processedMessage);
          } catch (error) {
            logger.error('Error processing new message', error as Error);
          }
        }
      }, new NewMessage({}));

      logger.info(`Successfully set up listener for ${this.channelName}`);
      return eventHandler;
    } catch (error) {
      logger.error('Error setting up message listener', error as Error);
      throw error;
    }
  }
}

export default ChannelScraper; 