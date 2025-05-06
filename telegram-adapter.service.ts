import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class TelegramAdapterService {
  private readonly logger = new Logger(TelegramAdapterService.name);
  private readonly adapterPath = path.join(__dirname, '../../../src/adapters/telegram-adapter');
  private readonly dataDir = path.join(__dirname, '../../../src/adapters/telegram-adapter/data');

  async scrape(config: any): Promise<any[]> {
    try {
      this.logger.log('Starting Telegram scraper');
      
      // Ensure the data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      
      // Run the Telegram scraper package with direct return
      const scrapedData = await this.runDirectScraper();
      
      // Transform the data to match our application schema
      const transformedData = this.transformData(scrapedData);
      
      this.logger.log(`Telegram scraper completed, fetched ${transformedData.length} items`);
      return transformedData;
    } catch (error) {
      this.logger.error(`Error executing Telegram scraper: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  private async runDirectScraper(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      // Create a temporary file to store the output
      const outputFile = path.join(this.dataDir, `telegram_output_${Date.now()}.json`);
      
      this.logger.log(`Running direct scraper, output will be saved to ${outputFile}`);
      
      // Run the scraper with output piped to a file
      const scraperProcess = spawn('npx', ['ts-node', 'src/scraper.ts'], {
        cwd: this.adapterPath,
        stdio: 'inherit',
        shell: true,
        env: {
          ...process.env,
          OUTPUT_FILE: outputFile.replace(/\\/g, '\\\\')
        }
      });
      
      scraperProcess.on('error', (error) => {
        this.logger.error('Failed to start scraper process', error);
        reject(error);
      });
      
      scraperProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Read the output file
            const fileContent = fs.readFileSync(outputFile, 'utf8');
            const data = JSON.parse(fileContent);
            
            this.logger.log(`Successfully parsed ${data.length} items from scraper output`);
            resolve(data);
          } catch (error) {
            this.logger.error('Failed to parse scraper output', error);
            reject(error);
          }
        } else {
          reject(new Error(`Scraper process exited with code ${code}`));
        }
      });
    });
  }
  
  private transformData(scrapedData: any[]): any[] {
    return scrapedData.map(item => ({
      sourceUrlOrId: item.data_post || `telegram_message_${item.id}`,
      title: item.message_text?.substring(0, 100) || 'Telegram Message',
      sourceType: 'telegram',
      sourceTimestamp: new Date(item.datetime || 0),
      scrapedAt: new Date(),
      details: item
    }));
  }
} 