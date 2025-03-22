import { Storage } from "@plasmohq/storage";

// Enhanced storage with type safety
export const storage = new Storage({ area: "local" });

// User settings interface
export interface UserSettings {
  // General settings
  BotSpeed: number; // 1-100
  GMsPerSessionMin: number;
  GMsPerSessionMax: number;
  RandomMouseMovement: boolean;
  AddGMButton: boolean;
  
  // Message templates
  messages: MessageTemplate[];
  
  // Targeting settings
  OnlyBlueChecks: boolean;
  PostWithinMinutes: number;
  UseNameReplacements: "always" | "never" | "smart";
  UsernameReplacements: string[];
  EndGreetingsFollowed: string[];
  
  // PRO Features
  EnableRetweets: boolean;
  RetweetConditions: {
    replies: number;
    retweets: number;
    likes: number;
  };
  CheckFollowing: boolean;
  ReplyLikesFrequency: number;
  ExtraLikesFrequency: number;
  
  // Enhanced features (new)
  UseSmartResponses: boolean;
  AnalyticsTracking: boolean;
  EngagementOptimization: boolean;
  AvoidTwitterLimits: boolean;
  MultiAccountSupport: boolean;
  ActiveAccounts: string[];
}

// Message template interface
export interface MessageTemplate {
  name: string;
  type: "simple" | "combo" | "smart";
  disabled: boolean;
  start: string[];
  end: string[];
  keywords: string[];
  images: string[];
  imageFrequency: number;
}

// Default settings
export const defaultSettings: UserSettings = {
  BotSpeed: 50,
  GMsPerSessionMin: 10,
  GMsPerSessionMax: 20,
  RandomMouseMovement: true,
  AddGMButton: true,
  
  messages: [
    {
      name: "GM",
      type: "combo",
      disabled: false,
      start: ["GM", "Good morning", "GM fren", "Morning"],
      end: ["Have a great {day}!", "Let's crush it today!", ""],
      keywords: ["gm", "morning", "goodmorning", "good morning"],
      images: [],
      imageFrequency: 10
    },
    {
      name: "GN",
      type: "combo",
      disabled: false,
      start: ["GN", "Good night", "Sweet dreams"],
      end: ["See you tomorrow!", "Rest well!", ""],
      keywords: ["gn", "night", "goodnight", "good night"],
      images: [],
      imageFrequency: 10
    }
  ],
  
  OnlyBlueChecks: false,
  PostWithinMinutes: 60,
  UseNameReplacements: "smart",
  UsernameReplacements: ["fren", "ser", "anon", "king", "queen"],
  EndGreetingsFollowed: ["Thanks for the follow!", "Appreciate the follow!"],
  
  EnableRetweets: false,
  RetweetConditions: {
    replies: 5,
    retweets: 10,
    likes: 20
  },
  CheckFollowing: false,
  ReplyLikesFrequency: 80,
  ExtraLikesFrequency: 20,
  
  // New enhanced features
  UseSmartResponses: true,
  AnalyticsTracking: true,
  EngagementOptimization: true,
  AvoidTwitterLimits: true,
  MultiAccountSupport: false,
  ActiveAccounts: []
};

// Initialize settings
export const initializeSettings = async (): Promise<void> => {
  const existingSettings = await storage.get<UserSettings>("settings");
  
  if (!existingSettings) {
    await storage.set("settings", defaultSettings);
  }

  // Initialize running tabs tracker
  const runningTabs = await storage.get<Record<string, boolean>>("gm-bot-running-tabs");
  if (!runningTabs) {
    await storage.set("gm-bot-running-tabs", {});
  }

  // Initialize processed tweets tracker
  const processedTweets = await storage.get<Record<string, string[]>>("done-ids");
  if (!processedTweets) {
    await storage.set("done-ids", {});
  }
  
  // Initialize analytics data
  const analytics = await storage.get<any>("analytics");
  if (!analytics) {
    await storage.set("analytics", {
      totalReplies: 0,
      totalLikes: 0,
      totalFollows: 0,
      totalRetweets: 0,
      history: [],
      accounts: {}
    });
  }
};

// Getter function with type safety
export const getSettings = async (): Promise<UserSettings> => {
  const settings = await storage.get<UserSettings>("settings");
  return settings || defaultSettings;
};

// Update settings
export const updateSettings = async (newSettings: Partial<UserSettings>): Promise<UserSettings> => {
  const currentSettings = await getSettings();
  const updatedSettings = { ...currentSettings, ...newSettings };
  await storage.set("settings", updatedSettings);
  return updatedSettings;
};