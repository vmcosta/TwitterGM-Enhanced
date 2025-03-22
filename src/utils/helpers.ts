/**
 * Utility functions for the GM Bot extension
 */

// Generate a random string with specified length
export const generateRandomString = (length: number = 32): string => {
  let result = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
  // Ensure first character is not a number
  do {
    result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (isCharNumber(result[0]));
  
  return result;
};

// Check if a character is a number
export const isCharNumber = (char: string): boolean => {
  return char >= "0" && char <= "9";
};

// Generate a random number within a range
export const getRandomInRange = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Get random delay based on bot speed
export const getRandomDelay = (baseDelay: number, speedFactor: number): number => {
  const randomFactor = 0.2 * Math.random() + 0.9; // 0.9-1.1 randomness
  return baseDelay * randomFactor * speedFactor;
};

// Check if the browser is Chrome
export const isChrome = (): boolean => {
  let isChrome = false;
  if (typeof chrome !== "undefined") {
    isChrome = typeof browser === "undefined";
  }
  return isChrome;
};

// Generate a hash from a string
export const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

// Sanitize text for keyword matching
export const sanitizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/"/g, "")
    .replace(/'/g, "")
    .replace(/'/g, "")
    .replace(/$/g, "");
};

// Format a username based on settings
export const formatUsername = (
  username: string, 
  replacementType: "always" | "never" | "smart", 
  replacements: string[]
): string => {
  if (!username) return "";
  
  // Remove special characters for normalization
  const normalizedUsername = username.replace(/[^a-zA-Z-]/g, "");
  
  // Check if first letter is uppercase (proper name)
  const isProperName = username.charAt(0) === username.charAt(0).toUpperCase();
  
  // Capitalize first letter and lowercase the rest
  const formattedName = isProperName
    ? username.charAt(0).toUpperCase() + username.slice(1).toLowerCase()
    : username.toLowerCase();
  
  if (replacementType === "never") {
    return formattedName;
  } else if (replacementType === "always") {
    return replacements[Math.floor(Math.random() * replacements.length)];
  } else {
    // Smart replacement logic
    const isAppropriateForRealName = isProperName && 
                                   normalizedUsername.length > 1 && 
                                   normalizedUsername.length <= 7 &&
                                   normalizedUsername.toLowerCase() !== "the";
    
    return isAppropriateForRealName
      ? formattedName
      : replacements[Math.floor(Math.random() * replacements.length)];
  }
};

// Parse metrics from string (e.g. "1.2K" to 1200)
export const parseMetric = (metricText: string): number | null => {
  if (typeof metricText !== "string") return null;
  
  const cleanText = metricText.replace(/[^\d.KM]/g, "");
  
  if (cleanText.includes("M")) {
    const value = parseFloat(cleanText) * 1000000;
    return isNaN(value) ? null : value;
  }
  
  if (cleanText.includes("K")) {
    const value = parseFloat(cleanText) * 1000;
    return isNaN(value) ? null : value;
  }
  
  const value = parseFloat(cleanText);
  return isNaN(value) ? null : value;
};

// Generate message from template
export const generateMessage = (
  username: string,
  templateIndex: number,
  isFollowed: boolean,
  templates: any[],
  endGreetingsFollowed: string[]
): string => {
  // Time of day replacement
  const timeOfDay = new Date().getHours() < 12 ? "morning" : 
                    new Date().getHours() < 18 ? "afternoon" : "evening";
  
  // Select random start phrase from the template
  let startPhrase = templates[templateIndex].start[
    Math.floor(Math.random() * templates[templateIndex].start.length)
  ];
  
  // For combo type, add an end phrase
  let endPhrase = "";
  if (templates[templateIndex].type === "combo") {
    endPhrase = templates[templateIndex].end[
      Math.floor(Math.random() * templates[templateIndex].end.length)
    ];
  }
  
  // Override end phrase for followed accounts if needed
  if (isFollowed) {
    endPhrase = endGreetingsFollowed[
      Math.floor(Math.random() * endGreetingsFollowed.length)
    ];
  }
  
  // Combine phrases
  let message = startPhrase;
  if (endPhrase) {
    message = message.concat(" ").concat(endPhrase);
  }
  
  // Replace placeholders
  message = message.replace(/{day}/g, timeOfDay);
  message = message.replace(/{name}/g, username);
  
  return message;
};