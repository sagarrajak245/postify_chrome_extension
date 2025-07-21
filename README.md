# Postify - AI Social Poster Chrome Extension

Transform your Gmail certificates into engaging social media posts with AI. Automatically scan Gmail for certificates and generate professional posts for LinkedIn and Twitter.

## 🚀 Features

- **Gmail Integration**: Automatically scan your Gmail for certificate emails
- **AI-Powered Post Generation**: Use OpenAI GPT to create engaging social media posts
- **Multi-Platform Support**: Post to LinkedIn and Twitter (Twitter ready, LinkedIn coming soon)
- **Smart Certificate Detection**: Automatically extracts certificate details and skills
- **Customizable Tones**: Generate posts in professional, casual, or excited tones
- **Beautiful UI**: Modern, intuitive interface built with React and Tailwind CSS

## 📋 Prerequisites

Before using this extension, you'll need to set up your own API keys and credentials:

1. **Google Client ID**: For Gmail OAuth authentication
2. **OpenAI API Key**: For AI post generation
3. **Twitter Bearer Token**: For posting to Twitter
4. **LinkedIn Client ID & Secret**: For LinkedIn posting (optional for now)

## 🛠️ Complete Setup Guide

### Step 1: Get Your API Keys & Credentials

#### 1. Google Client ID (Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" → "Library"
   - Search for "Gmail API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"
   - Choose "Chrome Extension" as application type
   - Add your extension ID (get this after loading the extension)
5. Copy the Client ID

#### 2. OpenAI API Key (Required)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

#### 3. Twitter Bearer Token (Required)
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Go to "Keys and tokens" tab
4. Generate "Bearer Token"
5. Copy the token

#### 4. LinkedIn Credentials (Optional)
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app
3. Get Client ID and Client Secret

### Step 2: Install and Configure Extension

#### 1. Build the Extension
```bash
# Clone the repository
git clone <repository-url>
cd postify-extension

# Install dependencies
npm install

# Build the extension
npm run build
```

#### 2. Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from your project
5. Note your extension ID (you'll need this for Google Client ID)

#### 3. Configure Google Client ID
1. Go back to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client ID
3. Add your extension ID to the "Authorized JavaScript origins"
4. Add `chrome-extension://YOUR_EXTENSION_ID` to origins

#### 4. Configure Extension Settings
1. Click the Postify extension icon in Chrome
2. Click the Settings (gear) icon
3. Enter all your API keys and credentials:
   - **Google Client ID**: Your OAuth 2.0 Client ID
   - **OpenAI API Key**: Your OpenAI secret key
   - **Twitter Bearer Token**: Your Twitter Bearer token
   - **LinkedIn Client ID & Secret**: (Optional)
4. Click "Save Settings"

## 🎯 How to Use the Extension

### Complete User Flow

#### 1. **Initial Setup** (One-time)
```
Install Extension → Configure Settings → Enter API Keys → Save Settings
```

#### 2. **Daily Usage Flow**
```
Open Extension → Sign in with Google → Scan Gmail → Select Certificate → Generate Post → Post to Social Media
```

#### 3. **Step-by-Step Usage**

**Step 1: Authenticate with Google**
- Click the Postify extension icon
- Click "Sign in with Google"
- Grant Gmail access permissions
- You'll see "Connected as [your name]"

**Step 2: Scan for Certificates**
- The extension automatically scans your Gmail for certificate emails
- Or click "Scan Gmail" to manually scan
- Certificates will appear in the list

**Step 3: Generate a Post**
- Click on any certificate from the list
- Click "Generate Post" button
- Choose platform (LinkedIn/Twitter)
- Select tone (Professional/Casual/Excited)
- Click "Generate Post"
- Review the AI-generated content

**Step 4: Post to Social Media**
- Click "Use This Post"
- Choose platform to post to
- Click "Post to [Platform]"
- Your post will be published!

**Step 5: Save as Draft (Optional)**
- Instead of posting immediately, click "Save"
- Post will be saved for later use

### What the Extension Does

1. **Gmail Scanning**: Searches for emails containing:
   - "certificate", "certification"
   - "course completion", "training completed"
   - "diploma", "achievement"
   - "you have completed"

2. **Certificate Extraction**: Automatically extracts:
   - Certificate title
   - Issuing organization
   - Date received
   - Skills mentioned
   - Description

3. **AI Post Generation**: Creates engaging posts with:
   - Professional, casual, or excited tone
   - Platform-specific formatting (LinkedIn vs Twitter)
   - Relevant hashtags
   - Character limit compliance

4. **Social Media Posting**: Posts directly to:
   - Twitter (ready now)
   - LinkedIn (coming soon)

## 🔧 Troubleshooting

### Common Issues & Solutions

#### 1. "Google Client ID not configured"
- Go to Settings and enter your Google Client ID
- Make sure you've added your extension ID to Google Cloud Console

#### 2. "OpenAI API key not configured"
- Go to Settings and enter your OpenAI API key
- Ensure the key starts with `sk-`

#### 3. "Gmail access denied"
- Re-authenticate with Google
- Check that Gmail API is enabled in your Google Cloud Console
- Verify your Google Client ID is correct

#### 4. "Twitter posting failed"
- Verify your Twitter Bearer token in Settings
- Ensure the token has write permissions
- Check that your Twitter app has the right permissions

#### 5. "No certificates found"
- Check that you have certificate emails in Gmail
- Try adjusting the search query in GmailService
- Make sure you're signed in with the correct Gmail account

### Debug Mode
- Right-click the extension icon → "Inspect popup"
- Check the Console tab for error messages
- Verify network requests in the Network tab

## 📦 Publishing to Chrome Web Store

### 1. Prepare Your Extension
```bash
# Build and package
npm run build
npm run package
```

### 2. Chrome Web Store Submission
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay the one-time $5 registration fee
3. Click "Add new item"
4. Upload the `postify-extension.zip` file
5. Fill in store listing details

### 3. Required Information
- **Description**: Use the template below
- **Screenshots**: At least 1 screenshot (1280x800 or 640x400)
- **Icon**: 128x128 PNG icon
- **Privacy Policy**: Required for data collection
- **Terms of Service**: Required for API usage

### 4. Store Listing Description Template
```
Transform your Gmail certificates into engaging social media posts with AI!

🎯 Key Features:
• Automatically scan Gmail for certificate emails
• AI-powered post generation using OpenAI GPT
• Post directly to LinkedIn and Twitter
• Smart certificate detection and skill extraction
• Multiple tone options (Professional, Casual, Excited)
• Beautiful, intuitive interface

🚀 How it works:
1. Connect your Gmail account
2. Scan for certificate emails
3. Generate AI-powered posts
4. Share to your social networks

Perfect for professionals, students, and anyone looking to showcase their achievements on social media!

Note: Requires OpenAI API key and social media tokens for full functionality.
```

## 🔒 Privacy & Security

### Data Collection
- **Gmail Data**: Only scans for certificate-related emails
- **User Data**: Stores settings and generated posts locally
- **API Calls**: Makes calls to OpenAI, Twitter, and LinkedIn APIs

### Data Handling
- All data is stored locally in Chrome storage
- No data is sent to external servers except for API calls
- API keys are stored securely in extension storage

### Permissions Required
- `identity`: For Google OAuth authentication
- `storage`: For storing extension data
- `scripting`: For content script injection
- Host permissions for Gmail, OpenAI, Twitter, and LinkedIn APIs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:
1. Check the troubleshooting section
2. Review the console for error messages
3. Create an issue on GitHub with detailed information

## 🔄 Version History

- **v1.0.0**: Initial release with Gmail scanning, AI post generation, and Twitter posting
- Future versions will include LinkedIn posting and additional features

---

## ⚠️ Important Notes

1. **Each user needs their own Google Client ID** - The extension cannot use a shared Client ID
2. **API keys are required** - The extension won't work without proper configuration
3. **Gmail access is required** - Users must grant Gmail permissions
4. **Social media tokens needed** - For posting functionality

**Setup Time**: ~10-15 minutes for initial configuration
**Daily Usage**: ~2-3 minutes per post generation
