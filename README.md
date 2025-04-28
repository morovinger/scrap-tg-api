# Telegram Channel Scraper

A modular TypeScript application for scraping the "arendabatumi" channel in Telegram using GramJS.

## Project Structure

```
telegram-scraper/
├── src/
│   ├── client/             # Telegram client setup
│   ├── config/             # Environment configuration
│   ├── models/             # Type definitions
│   ├── scrapers/           # Channel-specific scraping functionality
│   ├── utils/              # Utility functions
│   └── index.ts            # Main entry point
├── .env                    # Environment variables (not tracked in git)
├── sample.env              # Sample environment variables
└── README.md               # Project documentation
```

## Modules

The application is divided into several modules:

1. **Client Module** (`src/client/telegram.ts`): Handles Telegram authentication and client creation
2. **Config Module** (`src/config/env.ts`): Manages environment variables and configuration validation
3. **Models Module** (`src/models/message.ts`): Type definitions for message data
4. **Scraper Module** (`src/scrapers/channelScraper.ts`): Core functionality for scraping channel messages
5. **Utilities**:
   - Logger (`src/utils/logger.ts`): Handles logging
   - FileStorage (`src/utils/fileStorage.ts`): Manages saving and loading messages to/from files

## Setup

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Copy sample.env to .env:
   ```
   cp sample.env .env
   ```
4. Modify the .env file with your specific configuration if needed

## Usage

Run the scraper in development mode:
```
npm run dev
```

Build and run in production:
```
npm run build
npm start
```

## Environment Configuration

- `API_ID`: Your Telegram API ID
- `API_HASH`: Your Telegram API hash
- `SESSION_NAME`: Name for the session file
- `TARGET_CHANNEL`: Channel username to scrape (without @)

## Data Storage

Scraped messages are saved as JSON files in the `data/` directory:
- Initial messages: `[channel]_initial_[timestamp].json`
- New messages: `[channel]_live_[timestamp].json`

## Authentication

On first run, you will be prompted to authenticate with your Telegram account. The session will be saved for future use 