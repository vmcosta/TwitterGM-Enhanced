import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Storage } from "@plasmohq/storage";
import { sendToBackground } from "@plasmohq/messaging";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  CssBaseline,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme
} from "@mui/material";
import {
  PlayArrow as PlayIcon,
  Settings as SettingsIcon,
  Stop as StopIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  Twitter as TwitterIcon
} from "@mui/icons-material";

// Create a dark theme that matches Twitter's dark mode
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#1D9BF0"
    },
    secondary: {
      main: "#8B98A5"
    },
    background: {
      default: "#000000",
      paper: "#15202B"
    }
  },
  typography: {
    fontFamily: '"TwitterChirp", "Roboto", "Helvetica", "Arial", sans-serif'
  }
});

// Popup component
const Popup = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [stats, setStats] = useState({
    totalReplies: 0,
    totalLikes: 0,
    totalRetweets: 0,
    totalFollows: 0
  });
  
  const storage = new Storage({ area: "local" });
  
  // Initialize popup
  useEffect(() => {
    const initialize = async () => {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      setCurrentTab(tabs[0]);
      
      // Check if bot is running in this tab
      const tabsData = await storage.get("gm-bot-running-tabs") || {};
      if (tabsData && tabs[0]?.id && tabsData[tabs[0].id]) {
        setIsRunning(true);
      }
      
      // Get analytics data
      const analytics = await storage.get("analytics") || {
        totalReplies: 0,
        totalLikes: 0,
        totalRetweets: 0,
        totalFollows: 0
      };
      
      setStats({
        totalReplies: analytics.totalReplies || 0,
        totalLikes: analytics.totalLikes || 0,
        totalRetweets: analytics.totalRetweets || 0,
        totalFollows: analytics.totalFollows || 0
      });
      
      setIsInitialized(true);
    };
    
    initialize();
  }, []);
  
  // Handle start button click
  const handleStartBot = async () => {
    if (!currentTab?.id) return;
    
    // Send message to content script to start bot
    await chrome.tabs.sendMessage(currentTab.id, {
      action: "start-bot"
    });
    
    // Update running status
    setIsRunning(true);
    
    // Update storage
    const tabsData = await storage.get("gm-bot-running-tabs") || {};
    tabsData[currentTab.id] = true;
    await storage.set("gm-bot-running-tabs", tabsData);
    
    // Close popup
    window.close();
  };
  
  // Handle stop button click
  const handleStopBot = async () => {
    if (!currentTab?.id) return;
    
    // Send message to content script to stop bot
    await chrome.tabs.sendMessage(currentTab.id, {
      action: "stop-bot"
    });
    
    // Update running status
    setIsRunning(false);
    
    // Update storage
    const tabsData = await storage.get("gm-bot-running-tabs") || {};
    tabsData[currentTab.id] = false;
    await storage.set("gm-bot-running-tabs", tabsData);
  };
  
  // Open options page
  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };
  
  // Check if current tab is on Twitter
  const isTwitterTab = currentTab?.url?.includes("twitter.com") || currentTab?.url?.includes("x.com");
  
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ width: 300, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TwitterIcon sx={{ color: "#1D9BF0", mr: 1 }} />
            <Typography variant="h6">GM Bot Enhanced</Typography>
          </Box>
          <Tooltip title="Settings">
            <IconButton onClick={openOptions}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {!isInitialized ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : (
          <>
            {!isTwitterTab ? (
              <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "background.paper" }}>
                <Typography align="center" color="error">
                  Please navigate to Twitter/X to use the bot
                </Typography>
              </Card>
            ) : (
              <>
                <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Bot Status:
                  </Typography>
                  <Box 
                    sx={{ 
                      display: "flex", 
                      alignItems: "center",
                      color: isRunning ? "success.main" : "text.secondary"
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: isRunning ? "success.main" : "text.disabled",
                        mr: 1
                      }}
                    />
                    <Typography>
                      {isRunning ? "Running" : "Not Running"}
                    </Typography>
                  </Box>
                </Card>
                
                <Card variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "background.paper" }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <TimelineIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">Total Stats</Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="Replies"
                        secondary={stats.totalReplies}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Likes"
                        secondary={stats.totalLikes}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Retweets"
                        secondary={stats.totalRetweets}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="Follows"
                        secondary={stats.totalFollows}
                      />
                    </ListItem>
                  </List>
                </Card>
                
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                  {!isRunning ? (
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      startIcon={<PlayIcon />}
                      onClick={handleStartBot}
                    >
                      Start Bot
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      color="error"
                      fullWidth
                      startIcon={<StopIcon />}
                      onClick={handleStopBot}
                    >
                      Stop Bot
                    </Button>
                  )}
                </Box>
              </>
            )}
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary" align="center" display="block">
                v1.0.0 - Enhanced GM Bot for Twitter/X
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

// Render the Popup component
const root = createRoot(document.getElementById("__plasmo"));
root.render(<Popup />);

export default Popup;