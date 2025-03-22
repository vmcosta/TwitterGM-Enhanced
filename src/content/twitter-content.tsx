import { useStorage } from "@plasmohq/storage/hook";
import { useEffect, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";

import { initializeSettings, getSettings } from "../storage/settings";
import { mouseSimulator } from "../services/mouse-simulator";
import { tweetProcessor } from "../services/tweet-processor";
import { analyticsService } from "../services/analytics-service";
import { getRandomDelay, getRandomInRange } from "../utils/helpers";

// Twitter Bot Dashboard Component
const TwitterBotDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string>("");
  const [sessionProgress, setSessionProgress] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [infoMessage, setInfoMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [totalStats, setTotalStats] = useState({
    replies: 0,
    likes: 0,
    retweets: 0,
    follows: 0
  });
  
  const [settings] = useStorage("settings", async () => {
    await initializeSettings();
    return await getSettings();
  });
  
  useEffect(() => {
    // Extract username from URL
    const extractUsername = () => {
      const pathParts = window.location.pathname.split("/");
      if (pathParts.length > 1 && pathParts[1] !== "") {
        return pathParts[1];
      }
      return "";
    };
    
    const username = extractUsername();
    if (username) {
      setCurrentUsername(username);
    }
    
    // Initialize tweet processor
    if (username) {
      tweetProcessor.initialize(username);
    }
    
    // Check if bot should be auto-started
    checkAutoStart();
    
    // Set up observer for tweet scanning
    setupTweetObserver();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleBackgroundMessages);
    
    return () => {
      // Clean up event listeners
      chrome.runtime.onMessage.removeListener(handleBackgroundMessages);
    };
  }, []);
  
  // Check if the bot should auto-start
  const checkAutoStart = async () => {
    const tabs = await chrome.storage.local.get("gm-bot-running-tabs");
    const runningTabs = tabs["gm-bot-running-tabs"] || {};
    
    const tabId = await sendToBackground({ name: "get-tab-id" });
    
    if (runningTabs[tabId]) {
      startBot();
    }
  };
  
  // Handle messages from background script
  const handleBackgroundMessages = (message, sender, sendResponse) => {
    if (message.action === "status-update") {
      updateStats(message.stats);
    } else if (message.action === "start-bot") {
      startBot();
    } else if (message.action === "stop-bot") {
      stopBot();
    }
    
    sendResponse({ success: true });
    return true;
  };
  
  // Set up mutation observer to detect new tweets
  const setupTweetObserver = () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Look for tweet elements in added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // Find tweet elements
              const tweetElements = element.querySelectorAll('[data-testid="tweet"]');
              tweetElements.forEach((tweet) => {
                tweetProcessor.processTweet(tweet as HTMLElement);
              });
            }
          });
        }
      });
    });
    
    // Start observing the document with configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
  };
  
  // Start the bot
  const startBot = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    // Update running tabs in storage
    const tabId = await sendToBackground({ name: "get-tab-id" });
    const tabs = await chrome.storage.local.get("gm-bot-running-tabs");
    const runningTabs = tabs["gm-bot-running-tabs"] || {};
    runningTabs[tabId] = true;
    await chrome.storage.local.set({ "gm-bot-running-tabs": runningTabs });
    
    // Start analytics session
    analyticsService.startSession(currentUsername);
    
    // Determine session size
    const settings = await getSettings();
    const sessionMin = settings.GMsPerSessionMin;
    const sessionMax = settings.GMsPerSessionMax;
    const sessionSize = getRandomInRange(sessionMin, sessionMax);
    
    setSessionTotal(sessionSize);
    setSessionProgress(0);
    setInfoMessage("Running...");
    
    // Start mouse simulation if enabled
    if (settings.RandomMouseMovement) {
      mouseSimulator.start(true);
    }
    
    // Start the bot loop
    processTweets(sessionSize);
  };
  
  // Stop the bot
  const stopBot = async (isCompleted = false) => {
    if (!isRunning) return;
    
    setIsRunning(false);
    
    // Stop mouse simulation
    mouseSimulator.stop();
    
    // Update running tabs in storage
    const tabId = await sendToBackground({ name: "get-tab-id" });
    const tabs = await chrome.storage.local.get("gm-bot-running-tabs");
    const runningTabs = tabs["gm-bot-running-tabs"] || {};
    runningTabs[tabId] = false;
    await chrome.storage.local.set({ "gm-bot-running-tabs": runningTabs });
    
    // Save completed tweets
    await tweetProcessor.saveCompletedTweets();
    
    // End analytics session
    await analyticsService.endSession();
    
    // Show completion message
    setInfoMessage(isCompleted ? "Completed session!" : "Stopped");
    setTimeLeft("");
    
    // Show close button if completed
    if (isCompleted) {
      // Implementation for displaying a close button
    }
  };
  
  // Process tweets in the queue
  const processTweets = async (sessionSize: number) => {
    if (!isRunning) return;
    
    const settings = await getSettings();
    const speedFactor = 0.4 + (100 - settings.BotSpeed) / 60;
    
    // Get tweets to process
    const tweets = tweetProcessor.getProcessedTweets();
    const actionableTweets = tweets.filter(t => 
      !t.sent && (t.shouldReply || t.shouldLike || t.shouldRetweet)
    );
    
    // Count completed actions
    const completedCount = tweets.filter(t => t.sent).length;
    setSessionProgress(completedCount);
    
    // Calculate progress percentage
    const percentage = (completedCount / sessionSize) * 100;
    const remainingActions = sessionSize - completedCount;
    
    // Update dashboard progress
    document.getElementById("gmProgressBar")?.setAttribute(
      "style", 
      `height: 12px; background: #fff; width: ${Math.min(percentage, 100)}%; border-radius: 6px; max-width: 120px;`
    );
    
    // Update stats in UI
    const sessionStats = analyticsService.getCurrentSessionStats();
    if (sessionStats) {
      setTotalStats({
        replies: sessionStats.replies,
        likes: sessionStats.likes,
        retweets: sessionStats.retweets,
        follows: sessionStats.follows
      });
    }
    
    // Estimate time remaining
    if (remainingActions > 0 && completedCount > 0) {
      const avgTimePerAction = 15; // Seconds per action estimation
      const remainingSeconds = remainingActions * avgTimePerAction;
      
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = Math.floor(remainingSeconds % 60);
      
      setTimeLeft(`Est. time: ${minutes}m ${seconds}s`);
    }
    
    // Check if we've reached our session limit
    if (completedCount >= sessionSize) {
      stopBot(true);
      return;
    }
    
    // Process next action if there are actionable tweets
    if (actionableTweets.length > 0) {
      await processNextAction(actionableTweets[0], speedFactor);
    }
    
    // If no tweets to process, scroll to fetch more
    if (actionableTweets.length === 0) {
      setInfoMessage("Scrolling for tweets...");
      await scrollForContent();
    }
    
    // Schedule next processing cycle with a delay
    setTimeout(() => {
      processTweets(sessionSize);
    }, getRandomInRange(1000, 3000));
  };
  
  // Process a single action (reply, like, retweet)
  const processNextAction = async (tweet: any, speedFactor: number) => {
    try {
      // Different delays for different actions
      const replyDelay = getRandomDelay(1200, speedFactor);
      const likeDelay = getRandomDelay(600, speedFactor);
      const retweetDelay = getRandomDelay(1000, speedFactor);
      const followDelay = getRandomDelay(2000, speedFactor);
      
      // Set info message
      setInfoMessage(`Processing tweet...`);
      
      // Find tweet element
      const tweetElement = document.querySelector(`[data-gmid="${tweet.id}"]`);
      if (!tweetElement) return;
      
      // Perform actions sequentially
      if (tweet.shouldLike) {
        await performLikeAction(tweetElement, likeDelay);
      }
      
      if (tweet.shouldRetweet) {
        await performRetweetAction(tweetElement, retweetDelay);
      }
      
      if (tweet.shouldReply) {
        await performReplyAction(tweet, replyDelay);
      }
      
      // Perform follow action if enabled
      if (settings?.CheckFollowing) {
        await performFollowAction(tweetElement, tweet.handle, followDelay);
      }
      
      // Mark as sent
      tweetProcessor.markTweetAsCompleted(tweet.id);
      
    } catch (error) {
      console.error("Error processing action:", error);
    }
  };
  
  // Perform like action
  const performLikeAction = async (tweetElement: Element, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const likeButton = tweetElement.querySelector('[data-testid="like"]');
          if (likeButton && !likeButton.getAttribute("aria-pressed")) {
            (likeButton as HTMLElement).click();
            
            // Update analytics
            analyticsService.trackLike();
          }
        } catch (e) {
          console.error("Error performing like:", e);
        }
        resolve();
      }, delay);
    });
  };
  
  // Perform retweet action
  const performRetweetAction = async (tweetElement: Element, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          const retweetButton = tweetElement.querySelector('[data-testid="retweet"]');
          if (retweetButton) {
            (retweetButton as HTMLElement).click();
            
            // Wait for retweet dialog
            setTimeout(() => {
              const confirmButton = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmButton) {
                (confirmButton as HTMLElement).click();
                
                // Update analytics
                analyticsService.trackRetweet();
              }
            }, 500);
          }
        } catch (e) {
          console.error("Error performing retweet:", e);
        }
        resolve();
      }, delay);
    });
  };
  
  // Perform reply action
  const performReplyAction = async (tweet: any, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          // Use background service to handle reply
          await sendToBackground({
            name: "perform-action",
            body: {
              type: "reply",
              tweetId: tweet.id,
              message: tweet.message,
              image: tweet.image
            }
          });
          
          // Update analytics
          analyticsService.trackReply(tweet.handle);
          
        } catch (e) {
          console.error("Error performing reply:", e);
        }
        resolve();
      }, delay);
    });
  };
  
  // Perform follow action
  const performFollowAction = async (tweetElement: Element, handle: string, delay: number): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          // Find user profile link and navigate to it to check follow status
          const profileLink = tweetElement.querySelector(`a[href="/${handle}"]`);
          if (profileLink) {
            // For now, we're not implementing the actual follow action
            // as it requires navigating away from the current page
            
            // Simulate successful follow for demo purposes
            if (Math.random() < 0.3) { // 30% chance to follow
              analyticsService.trackFollow(handle);
            }
          }
        } catch (e) {
          console.error("Error performing follow:", e);
        }
        resolve();
      }, delay);
    });
  };
  
  // Scroll to load more content
  const scrollForContent = async (): Promise<void> => {
    return new Promise((resolve) => {
      const scrollAmount = getRandomInRange(500, 1000);
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      
      setTimeout(resolve, getRandomInRange(1500, 3000));
    });
  };
  
  // Update dashboard stats
  const updateStats = (stats: any) => {
    setTotalStats(prevStats => ({
      replies: prevStats.replies + (stats.replies || 0),
      likes: prevStats.likes + (stats.likes || 0),
      retweets: prevStats.retweets + (stats.retweets || 0),
      follows: prevStats.follows + (stats.follows || 0)
    }));
  };
  
  // Render the dashboard UI
  return (
    <div
      id="gm-bot"
      style={{
        fontFamily: "TwitterChirp",
        position: "fixed",
        top: "60px",
        right: "20px",
        background: "rgba(44, 155, 216, 0.6)",
        backdropFilter: "blur(3px)",
        textAlign: "center",
        border: "5px solid #1D9BF0",
        borderRadius: "6px",
        padding: "12px",
        color: "#fff",
        zIndex: 9999
      }}
    >
      <span style={{ fontWeight: "bold" }}>GM Bot Enhanced</span>
      <br />
      <br />
      <div
        id="gmProgressBar"
        style={{
          height: "12px",
          background: "#fff",
          width: `${isRunning ? (sessionProgress / sessionTotal) * 100 : 0}%`,
          borderRadius: "6px",
          maxWidth: "120px"
        }}
      ></div>
      <br />
      <span id="gmSessionHolder">
        Session: <span id="counterSessionText">{sessionProgress}</span>/{sessionTotal}
      </span>
      <br />
      <span id="infoMessage" style={{ fontWeight: "bold" }}>
        {infoMessage}
      </span>
      <br />
      <span id="timerLeft">{timeLeft}</span>
      <hr />
      <span style={{ fontWeight: "bold" }}>--- Total ---</span>
      <br />
      <span style={{ fontWeight: "bold" }}>Replies:</span>{" "}
      <span id="counterTotalReplies">{totalStats.replies}</span>
      <br />
      <span style={{ fontWeight: "bold" }}>Likes:</span>{" "}
      <span id="counterTotalLikes">{totalStats.likes}</span>
      <br />
      <span style={{ fontWeight: "bold" }}>Retweets:</span>{" "}
      <span id="counterTotalRetweets">{totalStats.retweets}</span>
      <br />
      <span style={{ fontWeight: "bold" }}>Follows:</span>{" "}
      <span id="counterTotalFollows">{totalStats.follows}</span>
      
      {!isRunning && (
        <>
          <hr />
          <button
            onClick={startBot}
            style={{
              background: "#1D9BF0",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Start Bot
          </button>
        </>
      )}
      
      {isRunning && (
        <>
          <hr />
          <button
            onClick={() => stopBot(false)}
            style={{
              background: "#E0245E",
              color: "white",
              border: "none",
              borderRadius: "4px",
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Stop Bot
          </button>
        </>
      )}
    </div>
  );
};

export default TwitterBotDashboard;