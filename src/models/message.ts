// Interface for structured message data
export interface MessageData {
  data_post: string;
  data_view?: string;
  user_url: string;
  user_photo?: string;
  user_name: string;
  message_url: string;
  message_text: string;
  message_photo: string[];
  message_video: string[];
  views?: string;
  datetime: string;
  id?: number;
}

// Interface for scraped message batch
export interface MessageBatch {
  channelName: string;
  messages: MessageData[];
  totalCount: number;
  batchTimestamp: Date;
}

// Interface for scraper options
export interface ScraperOptions {
  limit?: number;
  offsetId?: number;
  minId?: number;
  maxId?: number;
  fromDate?: Date;
  toDate?: Date;
}

export default MessageData; 