# Twitter GM Enhanced

A modernized and feature-rich Chrome extension for automated Twitter/X interactions with advanced analytics, natural mouse movement simulation, and customizable engagement settings.

## Features

### Core Features
- **Smart Tweet Processing**: Analyze tweets and automatically engage based on configurable criteria
- **Natural Mouse Movement**: Human-like cursor behavior to avoid detection
- **Enhanced Analytics**: Track all interactions and view detailed performance metrics
- **Multi-Account Support**: Manage multiple Twitter accounts from a single interface
- **Customizable Templates**: Create various message templates with dynamic variables
- **Targeting Options**: Filter tweets by follower count, engagement rates, and keywords
- **Session Management**: Set daily limits and schedule automated sessions

### PRO Features
- **Advanced Analytics Dashboard**: Visualize engagement metrics with charts and graphs
- **AI-Assisted Replies**: Generate contextually relevant replies based on tweet content
- **Behavioral Patterns**: Multiple movement patterns and timing variations
- **API Integration**: Connect with external services for extended functionality
- **Export/Import Settings**: Transfer your configuration between devices
- **Keyword Cloud Analysis**: Identify trending topics in your network

## Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "Twitter GM Enhanced"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Clone this repository
   ```
   git clone https://github.com/vmcosta/TwitterGM-Enhanced.git
   ```
2. Install dependencies
   ```
   npm install
   ```
3. Build the extension
   ```
   npm run build
   ```
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `build` directory

## Usage

1. Click the extension icon to open the popup
2. Configure your settings in the options page
3. Navigate to Twitter/X
4. Start the bot using the popup or keyboard shortcut

## Configuration Options

### General Settings
- Bot speed (slow, normal, fast)
- Auto-start on page load
- Daily interaction limits
- Notification preferences
- Mouse movement visibility
- Account targeting

### Message Templates
- Create multiple templates for different scenarios
- Use variables like {username}, {topic}, etc.
- Add emoji and hashtag variations
- Schedule different templates for different times

### Targeting Criteria
- Minimum/maximum follower count
- Engagement thresholds (likes, retweets, replies)
- Keyword inclusion/exclusion
- Account age filters
- Language preferences

## Development

This project is built using:
- [Plasmo](https://www.plasmo.com/) - Browser extension framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
- [React](https://reactjs.org/) - UI library
- [Material UI](https://mui.com/) - Component library
- [Simplex Noise](https://github.com/jwagner/simplex-noise.js/) - Natural movement simulation

### Development Commands
```
npm run dev     # Start development server
npm run build   # Build for production
npm run package # Create distribution package
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This extension is meant for educational purposes and legitimate social media management. Users are responsible for ensuring their usage complies with Twitter/X's terms of service. The developers are not responsible for any account restrictions resulting from the use of this extension.

---

**Note**: This is a modernized version of the original GM Bot extension, with significant enhancements in functionality, performance, and user experience.