import fs from 'fs';
import path from 'path';
import { MessageData } from '../models/message';
import { Logger } from './logger';

const logger = new Logger('FileStorage');

/**
 * Utility class for handling file storage operations
 */
export class FileStorage {
  private basePath: string;

  constructor(basePath: string = 'data') {
    this.basePath = path.join(process.cwd(), basePath);
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the storage directory exists
   */
  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
        logger.info(`Created directory: ${this.basePath}`);
      }
    } catch (error) {
      logger.error('Error creating directory', error as Error);
      throw error;
    }
  }

  /**
   * Save messages to a JSON file
   * @param messages Array of messages to save
   * @param prefix Optional filename prefix
   * @returns Path to the saved file
   */
  saveMessages(messages: MessageData[], prefix: string = 'messages'): string {
    try {
      // Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const fileName = `${prefix}_${timestamp}.json`;
      const filePath = path.join(this.basePath, fileName);
      
      // Write data to file
      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
      
      logger.info(`Saved ${messages.length} messages to ${filePath}`);
      return filePath;
    } catch (error) {
      logger.error('Error saving messages to file', error as Error);
      throw error;
    }
  }

  /**
   * Load messages from a JSON file
   * @param filePath Path to the JSON file
   * @returns Array of messages
   */
  loadMessages(filePath: string): MessageData[] {
    try {
      // Read file contents
      const fullPath = path.isAbsolute(filePath) 
        ? filePath
        : path.join(this.basePath, filePath);
      
      if (!fs.existsSync(fullPath)) {
        logger.error(`File not found: ${fullPath}`);
        return [];
      }
      
      const data = fs.readFileSync(fullPath, 'utf8');
      const messages = JSON.parse(data) as MessageData[];
      
      logger.info(`Loaded ${messages.length} messages from ${fullPath}`);
      return messages;
    } catch (error) {
      logger.error('Error loading messages from file', error as Error);
      return [];
    }
  }

  /**
   * List all saved message files
   * @returns Array of file paths
   */
  listMessageFiles(): string[] {
    try {
      // Get all JSON files in the directory
      const files = fs.readdirSync(this.basePath)
        .filter(file => file.endsWith('.json'))
        .map(file => path.join(this.basePath, file));
      
      logger.info(`Found ${files.length} message files`);
      return files;
    } catch (error) {
      logger.error('Error listing message files', error as Error);
      return [];
    }
  }
}

export default FileStorage; 