# 🚀 Quick Setup Guide for Postify Extension

## ⚡ 5-Minute Setup

### Step 1: Get Your API Keys (3 minutes)

#### 1. OpenAI API Key
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Sign in/Create account
- Click "Create new secret key"
- Copy the key (starts with `sk-`)

#### 2. Twitter Bearer Token
- Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- Create app or use existing
- Go to "Keys and tokens" → Generate "Bearer Token"
- Copy the token

#### 3. Google Client ID
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create new project
- Enable Gmail API: "APIs & Services" → "Library" → Search "Gmail API"
- Create OAuth 2.0: "APIs & Services" → "Credentials" → "OAuth 2.0 Client IDs"
- Choose "Chrome Extension"
- Copy the Client ID

### Step 2: Install Extension (1 minute)

1. Download the extension files
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → Select extension folder
5. Note your extension ID

### Step 3: Configure Google Client ID (1 minute)

1. Go back to Google Cloud Console
2. Edit your OAuth 2.0 Client ID
3. Add: `chrome-extension://YOUR_EXTENSION_ID`
4. Save

### Step 4: Configure Extension (1 minute)

1. Click Postify extension icon
2. Click Settings (gear icon)
3. Enter your keys:
   - Google Client ID
   - OpenAI API Key
   - Twitter Bearer Token
4. Click "Save Settings"

## ✅ You're Ready!

Now you can:
1. Sign in with Google
2. Scan Gmail for certificates
3. Generate AI posts
4. Post to Twitter!

## 🆘 Need Help?

- Check the main README.md for detailed instructions
- Review troubleshooting section
- Check console for error messages

---

**Total Setup Time**: ~5 minutes
**Daily Usage**: ~2-3 minutes per post 