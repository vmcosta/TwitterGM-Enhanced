import React, { useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";
import { createRoot } from "react-dom/client";
import { 
  Box, 
  Button, 
  Card, 
  Container, 
  CssBaseline, 
  Divider, 
  FormControl, 
  FormControlLabel, 
  Grid, 
  IconButton, 
  MenuItem, 
  Select, 
  Slider, 
  Stack, 
  Switch, 
  Tab, 
  Tabs, 
  TextField, 
  ThemeProvider, 
  Tooltip, 
  Typography, 
  createTheme 
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Message as MessageIcon,
  FilterList as FilterListIcon,
  Info as InfoIcon
} from "@mui/icons-material";

import { defaultSettings, UserSettings, MessageTemplate } from "../storage/settings";

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

// Tab panel components
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// Main Options component
const Options = () => {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [currentTab, setCurrentTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const storage = new Storage({ area: "local" });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      const storedSettings = await storage.get<UserSettings>("settings");
      
      if (storedSettings) {
        setSettings(storedSettings);
      } else {
        await storage.set("settings", defaultSettings);
      }
    };

    loadSettings();
  }, []);

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      await storage.set("settings", settings);
      setSaveMessage("Settings saved successfully!");
      
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
    } catch (error) {
      setSaveMessage("Error saving settings");
      console.error("Error saving settings:", error);
    }
    
    setIsSaving(false);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Handle changes to general settings
  const handleGeneralSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  // Handle changes to message templates
  const handleMessageChange = (index: number, field: keyof MessageTemplate, value: any) => {
    const updatedMessages = [...settings.messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      [field]: value
    };

    setSettings({
      ...settings,
      messages: updatedMessages
    });
  };

  // Handle changes to message template arrays (start, end, keywords, images)
  const handleMessageArrayChange = (
    index: number, 
    field: "start" | "end" | "keywords" | "images", 
    value: string[]
  ) => {
    const updatedMessages = [...settings.messages];
    updatedMessages[index] = {
      ...updatedMessages[index],
      [field]: value
    };

    setSettings({
      ...settings,
      messages: updatedMessages
    });
  };

  // Add a new message template
  const addMessageTemplate = () => {
    const newTemplate: MessageTemplate = {
      name: `Template ${settings.messages.length + 1}`,
      type: "combo",
      disabled: false,
      start: ["Hello"],
      end: [""],
      keywords: ["keyword"],
      images: [],
      imageFrequency: 0
    };

    setSettings({
      ...settings,
      messages: [...settings.messages, newTemplate]
    });
  };

  // Delete a message template
  const deleteMessageTemplate = (index: number) => {
    if (index < 2) {
      // Don't allow deleting GM or GN templates
      return;
    }

    const updatedMessages = [...settings.messages];
    updatedMessages.splice(index, 1);

    setSettings({
      ...settings,
      messages: updatedMessages
    });
  };

  // Handle changes to array values in a text field
  const handleArrayTextField = (
    index: number,
    field: "start" | "end" | "keywords" | "images",
    value: string
  ) => {
    // Split by newline and filter empty strings
    const arrayValues = value
      .split("\n")
      .map(item => item.trim())
      .filter(item => item !== "");

    handleMessageArrayChange(index, field, arrayValues);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Twitter GM Enhanced Settings
          </Typography>

          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs 
              value={currentTab} 
              onChange={handleTabChange} 
              variant="fullWidth"
              centered
            >
              <Tab icon={<SettingsIcon />} label="General" />
              <Tab icon={<MessageIcon />} label="Messages" />
              <Tab icon={<FilterListIcon />} label="Targeting" />
              <Tab icon={<TimelineIcon />} label="Analytics" />
            </Tabs>
          </Box>

          {/* General Settings Tab */}
          <TabPanel value={currentTab} index={0}>
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Session Settings
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography gutterBottom>Bot Speed</Typography>
                  <Slider
                    value={settings.BotSpeed}
                    onChange={(_, value) => handleGeneralSettingChange("BotSpeed", value)}
                    valueLabelDisplay="auto"
                    step={5}
                    marks
                    min={0}
                    max={100}
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption">Safer (Slower)</Typography>
                    <Typography variant="caption">Faster (Riskier)</Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Min GMs Per Session"
                    type="number"
                    value={settings.GMsPerSessionMin}
                    onChange={(e) => handleGeneralSettingChange("GMsPerSessionMin", Number(e.target.value))}
                    fullWidth
                    InputProps={{ inputProps: { min: 1, max: 100 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Max GMs Per Session"
                    type="number"
                    value={settings.GMsPerSessionMax}
                    onChange={(e) => handleGeneralSettingChange("GMsPerSessionMax", Number(e.target.value))}
                    fullWidth
                    InputProps={{ inputProps: { min: 5, max: 200 } }}
                  />
                </Grid>
              </Grid>
            </Card>
            
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Behavior Settings
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.RandomMouseMovement}
                        onChange={(e) => handleGeneralSettingChange("RandomMouseMovement", e.target.checked)}
                      />
                    }
                    label="Random Mouse Movement"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.AddGMButton}
                        onChange={(e) => handleGeneralSettingChange("AddGMButton", e.target.checked)}
                      />
                    }
                    label="Add GM Button"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.UseSmartResponses}
                        onChange={(e) => handleGeneralSettingChange("UseSmartResponses", e.target.checked)}
                      />
                    }
                    label="Use Smart Responses"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.AvoidTwitterLimits}
                        onChange={(e) => handleGeneralSettingChange("AvoidTwitterLimits", e.target.checked)}
                      />
                    }
                    label="Avoid Twitter Limits"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.AnalyticsTracking}
                        onChange={(e) => handleGeneralSettingChange("AnalyticsTracking", e.target.checked)}
                      />
                    }
                    label="Analytics Tracking"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.EngagementOptimization}
                        onChange={(e) => handleGeneralSettingChange("EngagementOptimization", e.target.checked)}
                      />
                    }
                    label="Engagement Optimization"
                  />
                </Grid>
              </Grid>
            </Card>
            
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Pro Features
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.EnableRetweets}
                        onChange={(e) => handleGeneralSettingChange("EnableRetweets", e.target.checked)}
                      />
                    }
                    label="Enable Retweets"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.CheckFollowing}
                        onChange={(e) => handleGeneralSettingChange("CheckFollowing", e.target.checked)}
                      />
                    }
                    label="Check Following"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Reply Likes Frequency (%)"
                    type="number"
                    value={settings.ReplyLikesFrequency}
                    onChange={(e) => handleGeneralSettingChange("ReplyLikesFrequency", Number(e.target.value))}
                    fullWidth
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Extra Likes Frequency (%)"
                    type="number"
                    value={settings.ExtraLikesFrequency}
                    onChange={(e) => handleGeneralSettingChange("ExtraLikesFrequency", Number(e.target.value))}
                    fullWidth
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                  />
                </Grid>
              </Grid>
              
              {settings.EnableRetweets && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                    Retweet Conditions
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Min Replies"
                        type="number"
                        value={settings.RetweetConditions.replies}
                        onChange={(e) => {
                          const updatedConditions = {
                            ...settings.RetweetConditions,
                            replies: Number(e.target.value)
                          };
                          handleGeneralSettingChange("RetweetConditions", updatedConditions);
                        }}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Min Retweets"
                        type="number"
                        value={settings.RetweetConditions.retweets}
                        onChange={(e) => {
                          const updatedConditions = {
                            ...settings.RetweetConditions,
                            retweets: Number(e.target.value)
                          };
                          handleGeneralSettingChange("RetweetConditions", updatedConditions);
                        }}
                        fullWidth
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Min Likes"
                        type="number"
                        value={settings.RetweetConditions.likes}
                        onChange={(e) => {
                          const updatedConditions = {
                            ...settings.RetweetConditions,
                            likes: Number(e.target.value)
                          };
                          handleGeneralSettingChange("RetweetConditions", updatedConditions);
                        }}
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                </>
              )}
            </Card>
          </TabPanel>

          {/* Messages Tab */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6">Message Templates</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={addMessageTemplate}
              >
                Add Template
              </Button>
            </Box>
            
            {settings.messages.map((template, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <TextField
                    label="Template Name"
                    value={template.name}
                    onChange={(e) => handleMessageChange(index, "name", e.target.value)}
                    sx={{ width: "200px" }}
                  />
                  
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!template.disabled}
                          onChange={(e) => handleMessageChange(index, "disabled", !e.target.checked)}
                        />
                      }
                      label="Enabled"
                    />
                    
                    {index >= 2 && (
                      <IconButton 
                        color="error" 
                        onClick={() => deleteMessageTemplate(index)}
                        title="Delete Template"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Template Type
                      </Typography>
                      <Select
                        value={template.type}
                        onChange={(e) => handleMessageChange(index, "type", e.target.value)}
                      >
                        <MenuItem value="simple">Simple (Start only)</MenuItem>
                        <MenuItem value="combo">Combo (Start + End)</MenuItem>
                        <MenuItem value="smart">Smart (AI-enhanced)</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <TextField
                      label="Start Phrases (one per line)"
                      multiline
                      rows={4}
                      value={template.start.join("\n")}
                      onChange={(e) => handleArrayTextField(index, "start", e.target.value)}
                      fullWidth
                    />
                    
                    {template.type === "combo" && (
                      <TextField
                        label="End Phrases (one per line)"
                        multiline
                        rows={4}
                        value={template.end.join("\n")}
                        onChange={(e) => handleArrayTextField(index, "end", e.target.value)}
                        fullWidth
                        sx={{ mt: 2 }}
                      />
                    )}
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" gutterBottom>
                      Trigger Keywords (one per line)
                    </Typography>
                    <TextField
                      multiline
                      rows={4}
                      value={template.keywords.join("\n")}
                      onChange={(e) => handleArrayTextField(index, "keywords", e.target.value)}
                      fullWidth
                      placeholder="Keywords that trigger this template"
                    />
                    
                    <Box sx={{ mt: 2 }}>
                      <Typography gutterBottom>
                        Image Frequency (%)
                      </Typography>
                      <Slider
                        value={template.imageFrequency}
                        onChange={(_, value) => handleMessageChange(index, "imageFrequency", value)}
                        valueLabelDisplay="auto"
                        step={5}
                        marks
                        min={0}
                        max={100}
                      />
                    </Box>
                    
                    <TextField
                      label="Image URLs (one per line)"
                      multiline
                      rows={4}
                      value={template.images.join("\n")}
                      onChange={(e) => handleArrayTextField(index, "images", e.target.value)}
                      fullWidth
                      sx={{ mt: 2 }}
                      placeholder="URLs to images to include in replies"
                    />
                  </Grid>
                </Grid>
              </Card>
            ))}
          </TabPanel>

          {/* Targeting Tab */}
          <TabPanel value={currentTab} index={2}>
            <Card variant="outlined" sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Tweet Targeting
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.OnlyBlueChecks}
                        onChange={(e) => handleGeneralSettingChange("OnlyBlueChecks", e.target.checked)}
                      />
                    }
                    label="Only Blue Checks"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Post Within Minutes"
                    type="number"
                    value={settings.PostWithinMinutes}
                    onChange={(e) => handleGeneralSettingChange("PostWithinMinutes", Number(e.target.value))}
                    fullWidth
                    helperText="Only reply to tweets posted within this timeframe (720 = 12 hours)"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography gutterBottom>Username Replacements</Typography>
                  <FormControl fullWidth>
                    <Select
                      value={settings.UseNameReplacements}
                      onChange={(e) => handleGeneralSettingChange("UseNameReplacements", e.target.value)}
                    >
                      <MenuItem value="never">Never (Always use real name)</MenuItem>
                      <MenuItem value="smart">Smart (Use real name when appropriate)</MenuItem>
                      <MenuItem value="always">Always (Always use replacement)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Username Replacements (one per line)"
                    multiline
                    rows={4}
                    value={settings.UsernameReplacements.join("\n")}
                    onChange={(e) => {
                      const values = e.target.value
                        .split("\n")
                        .map(item => item.trim())
                        .filter(item => item !== "");
                      handleGeneralSettingChange("UsernameReplacements", values);
                    }}
                    fullWidth
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Follow Thank You Messages (one per line)"
                    multiline
                    rows={4}
                    value={settings.EndGreetingsFollowed.join("\n")}
                    onChange={(e) => {
                      const values = e.target.value
                        .split("\n")
                        .map(item => item.trim())
                        .filter(item => item !== "");
                      handleGeneralSettingChange("EndGreetingsFollowed", values);
                    }}
                    fullWidth
                    helperText="Messages to add when replying to someone who follows you"
                  />
                </Grid>
              </Grid>
            </Card>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel value={currentTab} index={3}>
            <Typography variant="h6" gutterBottom>
              Analytics Dashboard Coming Soon
            </Typography>
            <Typography paragraph>
              Enhanced analytics features will be available in the next version.
            </Typography>
          </TabPanel>

          {/* Save Button */}
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center", alignItems: "center", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            
            {saveMessage && (
              <Typography 
                color={saveMessage.includes("Error") ? "error" : "success"}
                variant="body2"
              >
                {saveMessage}
              </Typography>
            )}
          </Box>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

// Render the Options component
const root = createRoot(document.getElementById("__plasmo"));
root.render(<Options />);

export default Options;