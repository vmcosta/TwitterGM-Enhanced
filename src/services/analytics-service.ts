import { Storage } from "@plasmohq/storage";
import { sendToBackground } from "@plasmohq/messaging";

/**
 * Analytics data interface
 */
interface AnalyticsData {
  totalReplies: number;
  totalLikes: number;
  totalFollows: number;
  totalRetweets: number;
  history: EngagementSession[];
  accounts: Record<string, AccountAnalytics>;
}

interface EngagementSession {
  date: string;
  username: string;
  replies: number;
  likes: number;
  follows: number;
  retweets: number;
  duration: number; // in minutes
}

interface AccountAnalytics {
  firstSeen: string;
  lastActive: string;
  totalSessions: number;
  totalReplies: number;
  totalLikes: number;
  totalFollows: number;
  totalRetweets: number;
  topRecipients: Record<string, number>; // username -> count
}

/**
 * Session analytics
 */
interface SessionStats {
  replies: number;
  likes: number;
  follows: number;
  retweets: number;
  startTime: number;
}

/**
 * Enhanced analytics service for tracking engagement metrics
 */
class AnalyticsService {
  private storage: Storage;
  private currentSession: SessionStats | null = null;
  private currentUsername: string = "";
  
  constructor() {
    this.storage = new Storage({ area: "local" });
  }
  
  /**
   * Start a new analytics session for a user
   */
  public startSession(username: string): void {
    this.currentUsername = username;
    this.currentSession = {
      replies: 0,
      likes: 0,
      follows: 0,
      retweets: 0,
      startTime: Date.now()
    };
  }
  
  /**
   * End the current analytics session and save data
   */
  public async endSession(): Promise<void> {
    if (!this.currentSession || !this.currentUsername) return;
    
    // Calculate session duration in minutes
    const durationMs = Date.now() - this.currentSession.startTime;
    const durationMinutes = Math.floor(durationMs / 60000);
    
    // Get current analytics data
    const analyticsData = await this.getAnalyticsData();
    
    // Update global totals
    analyticsData.totalReplies += this.currentSession.replies;
    analyticsData.totalLikes += this.currentSession.likes;
    analyticsData.totalFollows += this.currentSession.follows;
    analyticsData.totalRetweets += this.currentSession.retweets;
    
    // Add session to history
    analyticsData.history.push({
      date: new Date().toISOString(),
      username: this.currentUsername,
      replies: this.currentSession.replies,
      likes: this.currentSession.likes,
      follows: this.currentSession.follows,
      retweets: this.currentSession.retweets,
      duration: durationMinutes
    });
    
    // Limit history to last 100 sessions
    if (analyticsData.history.length > 100) {
      analyticsData.history = analyticsData.history.slice(-100);
    }
    
    // Update account-specific analytics
    if (!analyticsData.accounts[this.currentUsername]) {
      analyticsData.accounts[this.currentUsername] = {
        firstSeen: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalSessions: 1,
        totalReplies: this.currentSession.replies,
        totalLikes: this.currentSession.likes,
        totalFollows: this.currentSession.follows,
        totalRetweets: this.currentSession.retweets,
        topRecipients: {}
      };
    } else {
      const accountStats = analyticsData.accounts[this.currentUsername];
      accountStats.lastActive = new Date().toISOString();
      accountStats.totalSessions += 1;
      accountStats.totalReplies += this.currentSession.replies;
      accountStats.totalLikes += this.currentSession.likes;
      accountStats.totalFollows += this.currentSession.follows;
      accountStats.totalRetweets += this.currentSession.retweets;
    }
    
    // Save updated analytics
    await this.storage.set("analytics", analyticsData);
    
    // Send stats to background script (optional)
    await sendToBackground({
      name: "stats",
      body: {
        handle: this.currentUsername,
        replies: this.currentSession.replies,
        likes: this.currentSession.likes,
        follows: this.currentSession.follows,
        retweets: this.currentSession.retweets
      }
    });
    
    // Reset current session
    this.currentSession = null;
    this.currentUsername = "";
  }
  
  /**
   * Track a reply action
   */
  public trackReply(recipientHandle?: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.replies++;
    
    // Track recipient for analytics if provided
    if (recipientHandle && this.currentUsername) {
      this.updateRecipientStats(recipientHandle, "reply");
    }
  }
  
  /**
   * Track a like action
   */
  public trackLike(recipientHandle?: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.likes++;
    
    // Track recipient for analytics if provided
    if (recipientHandle && this.currentUsername) {
      this.updateRecipientStats(recipientHandle, "like");
    }
  }
  
  /**
   * Track a follow action
   */
  public trackFollow(recipientHandle: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.follows++;
    
    // Track recipient for analytics
    if (this.currentUsername) {
      this.updateRecipientStats(recipientHandle, "follow");
    }
  }
  
  /**
   * Track a retweet action
   */
  public trackRetweet(recipientHandle?: string): void {
    if (!this.currentSession) return;
    
    this.currentSession.retweets++;
    
    // Track recipient for analytics if provided
    if (recipientHandle && this.currentUsername) {
      this.updateRecipientStats(recipientHandle, "retweet");
    }
  }
  
  /**
   * Update recipient stats in analytics
   */
  private async updateRecipientStats(recipientHandle: string, action: string): Promise<void> {
    const analyticsData = await this.getAnalyticsData();
    
    if (!analyticsData.accounts[this.currentUsername]) return;
    
    const accountStats = analyticsData.accounts[this.currentUsername];
    
    if (!accountStats.topRecipients[recipientHandle]) {
      accountStats.topRecipients[recipientHandle] = 1;
    } else {
      accountStats.topRecipients[recipientHandle]++;
    }
    
    // Limit to top 100 recipients
    const sortedRecipients = Object.entries(accountStats.topRecipients)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100);
      
    accountStats.topRecipients = Object.fromEntries(sortedRecipients);
    
    await this.storage.set("analytics", analyticsData);
  }
  
  /**
   * Get current session stats
   */
  public getCurrentSessionStats(): SessionStats | null {
    return this.currentSession;
  }
  
  /**
   * Get all analytics data
   */
  public async getAnalyticsData(): Promise<AnalyticsData> {
    const data = await this.storage.get<AnalyticsData>("analytics");
    
    if (!data) {
      return {
        totalReplies: 0,
        totalLikes: 0,
        totalFollows: 0,
        totalRetweets: 0,
        history: [],
        accounts: {}
      };
    }
    
    return data;
  }
  
  /**
   * Get analytics for a specific account
   */
  public async getAccountAnalytics(username: string): Promise<AccountAnalytics | null> {
    const analyticsData = await this.getAnalyticsData();
    return analyticsData.accounts[username] || null;
  }
  
  /**
   * Get engagement history
   */
  public async getEngagementHistory(limit: number = 10): Promise<EngagementSession[]> {
    const analyticsData = await this.getAnalyticsData();
    return analyticsData.history.slice(-limit);
  }
  
  /**
   * Calculate engagement rate (replies per hour)
   */
  public async calculateEngagementRate(username: string, days: number = 7): Promise<number> {
    const analyticsData = await this.getAnalyticsData();
    
    if (!analyticsData.accounts[username]) return 0;
    
    // Filter sessions for specific user and time period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentSessions = analyticsData.history.filter(session => 
      session.username === username && 
      new Date(session.date) >= cutoffDate
    );
    
    // Calculate total engagement time
    const totalMinutes = recentSessions.reduce((sum, session) => sum + session.duration, 0);
    const totalHours = totalMinutes / 60;
    
    if (totalHours === 0) return 0;
    
    // Calculate engagements per hour
    const totalEngagements = recentSessions.reduce(
      (sum, session) => sum + session.replies + session.likes + session.follows + session.retweets, 
      0
    );
    
    return totalEngagements / totalHours;
  }
  
  /**
   * Get best performing time of day for engagements
   */
  public async getBestTimeOfDay(username: string): Promise<{ hour: number; engagements: number }[]> {
    const analyticsData = await this.getAnalyticsData();
    
    // Initialize hours array (0-23)
    const hourlyStats: { hour: number; engagements: number }[] = Array.from(
      { length: 24 }, 
      (_, i) => ({ hour: i, engagements: 0 })
    );
    
    // Count engagements by hour
    analyticsData.history
      .filter(session => session.username === username)
      .forEach(session => {
        const hour = new Date(session.date).getHours();
        const engagements = session.replies + session.likes + session.follows + session.retweets;
        hourlyStats[hour].engagements += engagements;
      });
    
    // Sort by engagement count
    return hourlyStats.sort((a, b) => b.engagements - a.engagements);
  }
}

// Export a singleton instance
export const analyticsService = new AnalyticsService();