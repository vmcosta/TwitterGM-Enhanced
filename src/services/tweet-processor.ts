import { sendToBackground } from "@plasmohq/messaging";
import { getSettings } from "../storage/settings";
import { formatUsername, generateMessage, generateRandomString, hashString, parseMetric, sanitizeText } from "../utils/helpers";
import { analyticsService } from "./analytics-service";

/**
 * Interfaces for tweet processing
 */
export interface ProcessedTweet {
  id: string;
  handle: string;
  canButtonReply: boolean;
  shouldReply: boolean;
  shouldLike: boolean;
  shouldRetweet: boolean;
  hasAutoActions: boolean;
  message?: string;
  prettyUsername?: string;
  messageObjIdx: number;
  image?: string;
  sent: boolean;
}

interface TweetMetrics {
  replies: number | null;
  retweets: number | null;
  likes: number | null;
}

/**
 * Modern TweetProcessor with enhanced features
 */
export class TweetProcessor {
  private currentUsername: string = "";
  private processedTweets: ProcessedTweet[] = [];
  private completedTweetIds: string[] = [];
  private settings: any = null;
  private timeOfDay: string = "day";
  
  constructor() {
    // Initialize time of day
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.timeOfDay = "morning";
    } else if (hour >= 12 && hour < 17) {
      this.timeOfDay = "afternoon";
    } else {
      this.timeOfDay = "evening";
    }
  }
  
  /**
   * Initialize the processor with user settings
   */
  public async initialize(username: string): Promise<void> {
    this.currentUsername = username;
    this.settings = await getSettings();
    
    // Load previously processed tweets
    const storedTweets = await chrome.storage.local.get("done-ids");
    if (storedTweets && storedTweets["done-ids"] && storedTweets["done-ids"][username]) {
      this.completedTweetIds = storedTweets["done-ids"][username];
    }
  }
  
  /**
   * Process a tweet element and determine actions
   */
  public async processTweet(tweetElement: HTMLElement): Promise<void> {
    // Skip if not initialized
    if (!this.settings) return;

    // Check if tweet is a reply or in a notification tab
    const isReplyOrNotification = this.isTweetReplyOrNotification(tweetElement);
    if (isReplyOrNotification) return;
    
    // Get the tweet author info
    const authorInfo = this.extractAuthorInfo(tweetElement);
    if (!authorInfo || authorInfo.handle === this.currentUsername) return;
    
    // Check verification status if needed
    if (this.settings.OnlyBlueChecks && !authorInfo.isVerified) return;
    
    // Check for like button (required for interaction)
    const likeButton = tweetElement.querySelector('[data-testid="like"]');
    if (!likeButton) return;
    
    // Extract tweet text and metrics
    const tweetText = this.extractTweetText(tweetElement);
    const sanitizedText = sanitizeText(tweetText);
    const tweetMetrics = this.extractTweetMetrics(tweetElement);
    
    // Generate unique ID
    const tweetUrl = tweetElement.querySelector('[role="link"]')?.[4]?.href;
    let tweetId: string;
    
    if (tweetUrl?.includes("/status/")) {
      const urlParts = tweetUrl.split("/");
      tweetId = `gm-${urlParts[3]}-${urlParts[5]}`;
    } else {
      tweetId = `gm-${hashString(authorInfo.handle + sanitizedText).toString()}`;
    }
    
    // Check if already processed
    const isAlreadyProcessed = this.processedTweets.some(t => t.id === tweetId);
    const isAlreadyCompleted = this.completedTweetIds.includes(tweetId);
    
    if (isAlreadyProcessed || isAlreadyCompleted) {
      this.addReplyBadge(tweetElement, tweetId, isAlreadyCompleted);
      return;
    }
    
    // Analyze tweet for automated actions
    const analysisResult = this.analyzeTweetForActions(sanitizedText, tweetMetrics);
    
    // Skip if no actions needed
    if (!analysisResult.shouldReply && !analysisResult.shouldLike && !analysisResult.shouldRetweet) {
      return;
    }
    
    // Prepare message if we should reply
    let message: string | undefined;
    let image: string | undefined;
    
    if (analysisResult.shouldReply) {
      // Format username based on settings
      const prettyUsername = formatUsername(
        authorInfo.displayName,
        this.settings.UseNameReplacements,
        this.settings.UsernameReplacements
      );
      
      // Generate message from template
      message = generateMessage(
        prettyUsername,
        analysisResult.messageIndex,
        false, // Not using isFollowed yet
        this.settings.messages,
        this.settings.EndGreetingsFollowed
      );
      
      // Check if we should add an image
      const messageTemplate = this.settings.messages[analysisResult.messageIndex];
      if (messageTemplate?.imageFrequency && 
          messageTemplate.images.length > 0 && 
          Math.random() < messageTemplate.imageFrequency / 100) {
        image = messageTemplate.images[Math.floor(Math.random() * messageTemplate.images.length)];
      }
    }
    
    // Add to processed tweets
    const processedTweet: ProcessedTweet = {
      id: tweetId,
      handle: authorInfo.handle,
      canButtonReply: analysisResult.shouldReply,
      shouldReply: analysisResult.shouldReply,
      shouldLike: analysisResult.shouldLike,
      shouldRetweet: analysisResult.shouldRetweet,
      hasAutoActions: analysisResult.shouldReply || analysisResult.shouldLike || analysisResult.shouldRetweet,
      message,
      prettyUsername: authorInfo.displayName,
      messageObjIdx: analysisResult.messageIndex,
      image,
      sent: false
    };
    
    this.processedTweets.push(processedTweet);
    
    // Add data attribute for easy reference
    const tweetContainer = tweetElement.closest("[data-testid='cellInnerDiv']");
    if (tweetContainer) {
      tweetContainer.setAttribute("data-gmid", tweetId);
    }
    
    // Add reply button if enabled
    this.addReplyBadge(tweetElement, tweetId, false);
  }
  
  /**
   * Extract author information from tweet
   */
  private extractAuthorInfo(tweetElement: HTMLElement): { handle: string; displayName: string; isVerified: boolean } | null {
    const authorElement = tweetElement.querySelector('[data-testid="User-Name"]') || 
                         tweetElement.querySelector('[data-testid="User-Names"]');
    if (!authorElement) return null;
    
    const anchorElement = authorElement.querySelector("a");
    if (!anchorElement || !anchorElement.href) return null;
    
    // Get handle from href
    const href = anchorElement.href;
    const lastSlashIndex = href.lastIndexOf("/");
    const handle = href.substring(lastSlashIndex + 1);
    
    // Get display name
    const nameSpan = authorElement.querySelector("span span");
    const displayName = nameSpan ? nameSpan.innerText.match(/^[^. ]+/gi)?.[0] || "" : "";
    
    // Check verification
    const isVerified = !!authorElement.querySelector('[aria-label="Verified account"]');
    
    return { handle, displayName, isVerified };
  }
  
  /**
   * Extract tweet text content
   */
  private extractTweetText(tweetElement: HTMLElement): string {
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!textElement) return "";
    
    let fullText = "";
    const walker = document.createTreeWalker(
      textElement,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          return node.nodeType === Node.TEXT_NODE || 
                 node.nodeName === "IMG" ? 
                 NodeFilter.FILTER_ACCEPT : 
                 NodeFilter.FILTER_SKIP;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        fullText += node.textContent;
      } else if (node.nodeName === "IMG") {
        fullText += (node as HTMLImageElement).alt || "";
      }
    }
    
    return fullText;
  }
  
  /**
   * Extract metrics (likes, replies, retweets) from tweet
   */
  private extractTweetMetrics(tweetElement: HTMLElement): TweetMetrics {
    const metricsContainer = tweetElement.querySelector('[role="group"]');
    if (!metricsContainer) {
      return { replies: null, retweets: null, likes: null };
    }
    
    const replyElement = tweetElement.querySelector('[data-testid="reply"]');
    const retweetElement = tweetElement.querySelector('[data-testid="retweet"]');
    const likeElement = tweetElement.querySelector('[data-testid="like"]');
    
    return {
      replies: replyElement ? parseMetric(replyElement.innerText) : null,
      retweets: retweetElement ? parseMetric(retweetElement.innerText) : null,
      likes: likeElement ? parseMetric(likeElement.innerText) : null
    };
  }
  
  /**
   * Check if tweet is a reply or in notification tab
   */
  private isTweetReplyOrNotification(tweetElement: HTMLElement): boolean {
    // Check if tweet is a reply (has 2 children in the header area)
    const isReply = (tweetElement.querySelector('[data-testid="User-Name"]')?.children.length === 2) ||
                   tweetElement.innerText.includes("Replying to");
    
    // Check if we're in the notifications tab
    const isNotification = window.location.href.includes(".com/notifications");
    
    return isReply || isNotification;
  }
  
  /**
   * Analyze tweet text and metrics to determine actions
   */
  private analyzeTweetForActions(tweetText: string, metrics: TweetMetrics): {
    shouldReply: boolean;
    shouldLike: boolean;
    shouldRetweet: boolean;
    messageIndex: number;
  } {
    let shouldReply = false;
    let shouldLike = false;
    let shouldRetweet = false;
    let messageIndex = -1;
    
    // Check for GM/GN keywords
    const isGM = /\bgm\b/i.test(tweetText) || 
                tweetText.includes("gmm") || 
                tweetText.includes("gmgm") || 
                tweetText.includes("ood mornin") || 
                tweetText.includes("oodmornin") || 
                tweetText.includes("gmornin") || 
                tweetText.startsWith("mornin") || 
                tweetText.startsWith("grand rising") || 
                tweetText.includes("g to the m") || 
                tweetText.includes("top of the mornin");
                
    const isGN = /\bgn\b/i.test(tweetText) || 
                tweetText.includes("gngn") || 
                tweetText.includes("ood night") || 
                tweetText.includes("oodnight") || 
                tweetText.includes("sweet dreams") || 
                tweetText.includes("gnight");
    
    // Check for GM message templates
    if (isGM && !this.settings.messages[0].disabled) {
      shouldReply = true;
      messageIndex = 0;
    } 
    // Check for GN message templates
    else if (isGN && !this.settings.messages[1].disabled) {
      shouldReply = true;
      messageIndex = 1;
    } 
    // Check for custom keywords (PRO feature)
    else if (this.settings.messages.length > 2) {
      for (let i = 2; i < this.settings.messages.length; i++) {
        const template = this.settings.messages[i];
        if (!template.disabled && template.keywords.some(keyword => tweetText.includes(sanitizeText(keyword)))) {
          shouldReply = true;
          messageIndex = i;
          break;
        }
      }
    }
    
    // Apply time filter if needed
    if (shouldReply && this.settings.PostWithinMinutes < 720) {
      // NOTE: This would be implemented with the actual tweet timestamp
      // For now, we're skipping this check
      // if (tweetTimestamp < cutoffTime) shouldReply = false;
    }
    
    // Determine like action
    if (shouldReply && this.settings.ReplyLikesFrequency) {
      shouldLike = Math.random() < this.settings.ReplyLikesFrequency / 100;
    } else if (this.settings.ExtraLikesFrequency) {
      shouldLike = Math.random() < this.settings.ExtraLikesFrequency / 100;
    }
    
    // Determine retweet action (PRO feature)
    if (this.settings.EnableRetweets && metrics.replies !== null && metrics.retweets !== null && metrics.likes !== null) {
      if (metrics.replies >= this.settings.RetweetConditions.replies &&
          metrics.retweets >= this.settings.RetweetConditions.retweets &&
          metrics.likes >= this.settings.RetweetConditions.likes) {
        shouldRetweet = true;
        shouldLike = true; // Always like when retweeting
      }
    }
    
    return {
      shouldReply,
      shouldLike,
      shouldRetweet,
      messageIndex
    };
  }
  
  /**
   * Add reply badge/button to tweet
   */
  private addReplyBadge(tweetElement: HTMLElement, tweetId: string, isCompleted: boolean): void {
    if (!this.settings.AddGMButton) return;
    
    const tweetContainer = tweetElement.closest("[data-testid='cellInnerDiv']");
    if (!tweetContainer) return;
    
    // Skip if button already exists
    if (tweetContainer.querySelector(`#gm-bot-btn-${tweetId}`)) return;
    
    // Find reply button container
    const replyButton = tweetElement.querySelector('[data-testid="reply"]');
    if (!replyButton) return;
    
    const replyButtonParent = replyButton.closest('[role="group"]');
    if (!replyButtonParent) return;
    
    const tweet = this.processedTweets.find(t => t.id === tweetId);
    
    // Create button element
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';
    buttonContainer.style.justifyContent = 'center';
    
    // Different style for completed vs actionable tweets
    if (isCompleted || (tweet && !tweet.canButtonReply)) {
      buttonContainer.innerHTML = `<div id="gm-bot-btn-${tweetId}" style="align-self: center; max-height: 24px; font-family: TwitterChirp; margin: 0 12px; padding: 0 6px 0 6px; background: #05C248; border-radius: 24px; display: inline-flex; justify-content: center; align-items: center; border: 2px solid #0099DA;">
        <img src="chrome-extension://${chrome.runtime.id}/assets/icon-mini.svg" width="20" height="20" style="margin-right: 1px;" />
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FFF" class="bi bi-check" viewBox="0 0 16 16">
          <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
        </svg>
      </div>`;
    } else if (tweet) {
      buttonContainer.innerHTML = `<button id="gm-bot-btn-${tweetId}" style="max-height: 30px; font-family: TwitterChirp; margin: 0 12px; padding: 0 6px 0 3px; background: #02A5EB; border-radius: 24px; display: inline-flex; justify-content: center; align-items: center; cursor: pointer; border: 2px solid #0099DA;">
        <img src="chrome-extension://${chrome.runtime.id}/assets/icon-mini.svg" width="19" height="19" style="margin-right: 1px;" />
        <div style="font-weight: bold; color: #fff;">${this.settings.messages[tweet.messageObjIdx].name}</div>
      </button>`;
      
      // Add click event listener
      buttonContainer.querySelector('button')?.addEventListener('click', () => {
        this.handleReplyButtonClick(tweetId);
      });
    }
    
    // Append to parent element
    replyButtonParent.appendChild(buttonContainer);
  }
  
  /**
   * Handle reply button click
   */
  private async handleReplyButtonClick(tweetId: string): Promise<void> {
    const tweet = this.processedTweets.find(t => t.id === tweetId);
    if (!tweet) return;
    
    // Add animation to button showing it's being processed
    const button = document.querySelector(`#gm-bot-btn-${tweetId}`);
    if (button) {
      button.classList.add('gm-bot-processing');
    }
    
    try {
      // Send message to content script to perform the reply
      await sendToBackground({
        name: "perform-action",
        body: {
          type: "reply",
          tweetId,
          message: tweet.message,
          image: tweet.image
        }
      });
      
      // Mark as completed
      tweet.sent = true;
      this.completedTweetIds.push(tweetId);
      
      // Update button to show completion
      this.updateReplyBadgeToCompleted(tweetId);
      
      // Track analytics
      analyticsService.trackReply(tweet.handle);
      
    } catch (error) {
      console.error("Error sending reply:", error);
      
      // Remove processing animation
      if (button) {
        button.classList.remove('gm-bot-processing');
      }
    }
  }
  
  /**
   * Update reply badge to completed state
   */
  private updateReplyBadgeToCompleted(tweetId: string): void {
    const button = document.querySelector(`#gm-bot-btn-${tweetId}`);
    if (!button) return;
    
    const buttonContainer = button.parentElement;
    if (!buttonContainer) return;
    
    buttonContainer.innerHTML = `<div id="gm-bot-btn-${tweetId}" style="align-self: center; max-height: 24px; font-family: TwitterChirp; margin: 0 12px; padding: 0 6px 0 6px; background: #05C248; border-radius: 24px; display: inline-flex; justify-content: center; align-items: center; border: 2px solid #0099DA;">
      <img src="chrome-extension://${chrome.runtime.id}/assets/icon-mini.svg" width="20" height="20" style="margin-right: 1px;" />
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#FFF" class="bi bi-check" viewBox="0 0 16 16">
        <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/>
      </svg>
    </div>`;
  }
  
  /**
   * Get list of tweets to process
   */
  public getProcessedTweets(): ProcessedTweet[] {
    return this.processedTweets;
  }
  
  /**
   * Get list of completed tweet IDs
   */
  public getCompletedTweetIds(): string[] {
    return this.completedTweetIds;
  }
  
  /**
   * Mark tweet as completed and update badge
   */
  public markTweetAsCompleted(tweetId: string): void {
    const tweet = this.processedTweets.find(t => t.id === tweetId);
    if (!tweet) return;
    
    tweet.sent = true;
    
    if (!this.completedTweetIds.includes(tweetId)) {
      this.completedTweetIds.push(tweetId);
    }
    
    this.updateReplyBadgeToCompleted(tweetId);
  }
  
  /**
   * Save completed tweets to storage
   */
  public async saveCompletedTweets(): Promise<void> {
    if (!this.currentUsername) return;
    
    const storedTweets = await chrome.storage.local.get("done-ids");
    const doneTweets = storedTweets["done-ids"] || {};
    
    if (doneTweets[this.currentUsername]) {
      doneTweets[this.currentUsername].push(...this.completedTweetIds);
    } else {
      doneTweets[this.currentUsername] = this.completedTweetIds;
    }
    
    // Keep only the last 100 entries
    doneTweets[this.currentUsername] = doneTweets[this.currentUsername].slice(-100);
    
    await chrome.storage.local.set({ "done-ids": doneTweets });
  }
}

// Create a singleton instance
export const tweetProcessor = new TweetProcessor();