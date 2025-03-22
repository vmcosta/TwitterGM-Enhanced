import { Storage } from "@plasmohq/storage";

// Define types for user settings
export interface UserSettings {
  // General Settings
  isEnabled: boolean;
  autoStart: boolean;
  speed: number; // 1-3 (slow, normal, fast)
  showMouse: boolean;
  showNotifications: boolean;
  replyEnabled: boolean;
  likeEnabled: boolean;
  retweetEnabled: boolean;
  followEnabled: boolean;
  saveHistory: boolean;
  
  // Daily Limits
  dailyLimits: {
    enabled: boolean;
    replies: number;
    likes: number;
    retweets: number;
    follows: number;
  };
  
  // Timing Settings
  timing: {
    minDelay: number;
    maxDelay: number;
    actionDelay: number;
    pauseBetweenTweets: number;
  };
  
  // Targeting Settings
  targeting: {
    minFollowers: number;
    maxFollowers: number;
    minLikes: number;
    minRetweets: number;
    includeKeywords: string[];
    excludeKeywords: string[];
    excludeAccounts: string[];
    preferredLanguages: string[];
    minimumAccountAgeDays: number;
  };
  
  // Pro Features
  pro: {
    enabled: boolean;
    aiReplies: boolean;
    advancedAnalytics: boolean;
    multipleAccounts: boolean;
    apiIntegration: boolean;
  };
}

// Define type for message templates
export interface MessageTemplate {
  id: string;
  name: string;
  template: string;
  isEnabled: boolean;
  usageWeight: number; // Higher weight = more frequent usage
  customEmojis: string[];
  customHashtags: string[];
}

// Define default settings
export const DEFAULT_SETTINGS: UserSettings = {
  isEnabled: false,
  autoStart: false,
  speed: 2, // Normal speed
  showMouse: true,
  showNotifications: true,
  replyEnabled: true,
  likeEnabled: true,
  retweetEnabled: true,
  followEnabled: false, // Disabled by default for safety
  saveHistory: true,
  
  dailyLimits: {
    enabled: true,
    replies: 50,
    likes: 100,
    retweets: 30,
    follows: 20
  },
  
  timing: {
    minDelay: 1000, // 1 second
    maxDelay: 5000, // 5 seconds
    actionDelay: 2000, // 2 seconds
    pauseBetweenTweets: 500 // 0.5 seconds
  },
  
  targeting: {
    minFollowers: 0,
    maxFollowers: 1000000,
    minLikes: 0,
    minRetweets: 0,
    includeKeywords: ["gm", "GM", "good morning", "Good Morning"],
    excludeKeywords: ["nsfw", "scam", "spam"],
    excludeAccounts: [],
    preferredLanguages: ["en"],
    minimumAccountAgeDays: 30
  },
  
  pro: {
    enabled: false,
    aiReplies: false,
    advancedAnalytics: false,
    multipleAccounts: false,
    apiIntegration: false
  }
};

// Default message templates
export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: "default_gm",
    name: "Standard GM",
    template: "GM {username}! Have a great day! {emoji}",
    isEnabled: true,
    usageWeight: 5,
    customEmojis: ["🌞", "☀️", "👋", "✨", "🚀", "😊", "☕"],
    customHashtags: ["#gm", "#GoodMorning", "#web3"]
  },
  {
    id: "friendly_gm",
    name: "Friendly GM",
    template: "GM {username}! Hope you're having an amazing day ahead! {emoji}",
    isEnabled: true,
    usageWeight: 3,
    customEmojis: ["🔥", "💯", "🙌", "✌️", "🌈", "💪", "🌻"],
    customHashtags: ["#gm", "#MorningVibes", "#web3community"]
  },
  {
    id: "simple_gm",
    name: "Simple GM",
    template: "gm {emoji}",
    isEnabled: true,
    usageWeight: 2,
    customEmojis: ["👋", "✨", "🚀", "🌞"],
    customHashtags: []
  }
];

// Class to manage settings
export class SettingsManager {
  private storage: Storage;
  private settingsKey = "gm-bot-settings";
  private templatesKey = "gm-bot-templates";
  
  constructor() {
    this.storage = new Storage({ area: "local" });
  }
  
  // Load user settings
  async loadSettings(): Promise<UserSettings> {
    const settings = await this.storage.get<UserSettings>(this.settingsKey);
    return settings || { ...DEFAULT_SETTINGS };
  }
  
  // Save user settings
  async saveSettings(settings: UserSettings): Promise<void> {
    await this.storage.set(this.settingsKey, settings);
  }
  
  // Load message templates
  async loadTemplates(): Promise<MessageTemplate[]> {
    const templates = await this.storage.get<MessageTemplate[]>(this.templatesKey);
    return templates || [...DEFAULT_TEMPLATES];
  }
  
  // Save message templates
  async saveTemplates(templates: MessageTemplate[]): Promise<void> {
    await this.storage.set(this.templatesKey, templates);
  }
  
  // Add a new message template
  async addTemplate(template: MessageTemplate): Promise<void> {
    const templates = await this.loadTemplates();
    templates.push(template);
    await this.saveTemplates(templates);
  }
  
  // Remove a message template
  async removeTemplate(templateId: string): Promise<void> {
    let templates = await this.loadTemplates();
    templates = templates.filter(t => t.id !== templateId);
    await this.saveTemplates(templates);
  }
  
  // Update a message template
  async updateTemplate(templateId: string, updatedTemplate: Partial<MessageTemplate>): Promise<void> {
    const templates = await this.loadTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updatedTemplate };
      await this.saveTemplates(templates);
    }
  }
  
  // Get enabled templates
  async getEnabledTemplates(): Promise<MessageTemplate[]> {
    const templates = await this.loadTemplates();
    return templates.filter(t => t.isEnabled);
  }
  
  // Reset settings to default
  async resetSettings(): Promise<void> {
    await this.saveSettings({ ...DEFAULT_SETTINGS });
  }
  
  // Reset templates to default
  async resetTemplates(): Promise<void> {
    await this.saveTemplates([...DEFAULT_TEMPLATES]);
  }
  
  // Reset everything
  async resetAll(): Promise<void> {
    await this.resetSettings();
    await this.resetTemplates();
  }
  
  // Export settings and templates as JSON
  async exportConfig(): Promise<string> {
    const settings = await this.loadSettings();
    const templates = await this.loadTemplates();
    
    return JSON.stringify({
      settings,
      templates,
      version: "1.0.0"
    }, null, 2);
  }
  
  // Import settings and templates from JSON
  async importConfig(jsonConfig: string): Promise<boolean> {
    try {
      const config = JSON.parse(jsonConfig);
      
      if (config.settings) {
        await this.saveSettings(config.settings);
      }
      
      if (config.templates) {
        await this.saveTemplates(config.templates);
      }
      
      return true;
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return false;
    }
  }
}

// Create and export a singleton instance
export const settingsManager = new SettingsManager();