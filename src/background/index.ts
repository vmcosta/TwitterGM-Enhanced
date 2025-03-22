import { Storage } from "@plasmohq/storage";

/**
 * Background Service Worker
 * 
 * This handles cross-tab communication, API operations, and other background tasks
 * for the Twitter GM Enhanced extension.
 */

// Initialize storage
const storage = new Storage({ area: "local" });

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.cmd === "stats") {
    // Update global stats
    updateStats(message.msg);
    sendResponse({ success: true });
  }
  
  return true;
});

// Handle message passing
export interface RequestBody {
  type: string;
  tweetId?: string;
  message?: string;
  image?: string;
}

// Message handler for get-tab-id
export async function getTabId(req: any, res: any) {
  if (!sender?.tab?.id) {
    res.send({ error: "No tab ID available" });
    return;
  }
  
  res.send(sender.tab.id);
}

// Message handler for perform-action
export async function performAction(req: { body: RequestBody }, res: any) {
  const { type, tweetId, message, image } = req.body;
  
  try {
    switch (type) {
      case "reply":
        await handleReplyAction(tweetId, message, image);
        break;
      case "like":
        await handleLikeAction(tweetId);
        break;
      case "retweet":
        await handleRetweetAction(tweetId);
        break;
      case "follow":
        await handleFollowAction(tweetId);
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
    
    res.send({ success: true });
  } catch (error) {
    console.error(`Error performing ${type} action:`, error);
    res.send({ error: String(error) });
  }
}

// Message handler for stats
export async function handleStats(req: any, res: any) {
  const stats = req.body;
  await updateStats(stats);
  res.send({ success: true });
}

// Handle reply action (simulated)
async function handleReplyAction(tweetId: string, message: string, image?: string): Promise<void> {
  // In a real implementation, this would use a more sophisticated approach
  // to interact with the Twitter UI or API for posting replies
  
  // For demo purposes, we'll just log the action
  console.log(`Replying to tweet ${tweetId} with message: ${message}`);
  
  if (image) {
    console.log(`Attaching image: ${image}`);
  }
  
  // Send message to all tabs on twitter.com to update the UI
  const tabs = await chrome.tabs.query({ url: "*://*.twitter.com/*" });
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "status-update",
        tweetId,
        stats: { replies: 1 }
      });
    }
  });
  
  return Promise.resolve();
}

// Handle like action (simulated)
async function handleLikeAction(tweetId: string): Promise<void> {
  console.log(`Liking tweet ${tweetId}`);
  
  // Send message to all tabs on twitter.com to update the UI
  const tabs = await chrome.tabs.query({ url: "*://*.twitter.com/*" });
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "status-update",
        tweetId,
        stats: { likes: 1 }
      });
    }
  });
  
  return Promise.resolve();
}

// Handle retweet action (simulated)
async function handleRetweetAction(tweetId: string): Promise<void> {
  console.log(`Retweeting tweet ${tweetId}`);
  
  // Send message to all tabs on twitter.com to update the UI
  const tabs = await chrome.tabs.query({ url: "*://*.twitter.com/*" });
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "status-update",
        tweetId,
        stats: { retweets: 1 }
      });
    }
  });
  
  return Promise.resolve();
}

// Handle follow action (simulated)
async function handleFollowAction(userId: string): Promise<void> {
  console.log(`Following user ${userId}`);
  
  // Send message to all tabs on twitter.com to update the UI
  const tabs = await chrome.tabs.query({ url: "*://*.twitter.com/*" });
  tabs.forEach(tab => {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: "status-update",
        userId,
        stats: { follows: 1 }
      });
    }
  });
  
  return Promise.resolve();
}

// Update global stats
async function updateStats(stats: any): Promise<void> {
  // Get current analytics data
  const analyticsData = await storage.get("analytics") || {
    totalReplies: 0,
    totalLikes: 0,
    totalFollows: 0,
    totalRetweets: 0,
    history: [],
    accounts: {}
  };
  
  // Update totals
  if (stats.replies) analyticsData.totalReplies += stats.replies;
  if (stats.likes) analyticsData.totalLikes += stats.likes;
  if (stats.follows) analyticsData.totalFollows += stats.follows;
  if (stats.retweets) analyticsData.totalRetweets += stats.retweets;
  
  // If this is a new account, initialize it
  if (stats.handle && !analyticsData.accounts[stats.handle]) {
    analyticsData.accounts[stats.handle] = {
      firstSeen: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      totalSessions: 0,
      totalReplies: 0,
      totalLikes: 0,
      totalFollows: 0,
      totalRetweets: 0,
      topRecipients: {}
    };
  }
  
  // Update account stats
  if (stats.handle) {
    const accountStats = analyticsData.accounts[stats.handle];
    accountStats.lastActive = new Date().toISOString();
    
    if (stats.replies) accountStats.totalReplies += stats.replies;
    if (stats.likes) accountStats.totalLikes += stats.likes;
    if (stats.follows) accountStats.totalFollows += stats.follows;
    if (stats.retweets) accountStats.totalRetweets += stats.retweets;
  }
  
  // Save updated analytics
  await storage.set("analytics", analyticsData);
}