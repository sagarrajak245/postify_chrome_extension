# 📖 Postify Extension - Complete User Guide

## 🎯 What This Extension Does

Postify automatically finds your certificate emails in Gmail and creates engaging social media posts using AI. Perfect for professionals, students, and anyone who wants to showcase their achievements!

## 🔄 Complete User Flow

### **First Time Setup** (One-time, ~10 minutes)

```
1. Get API Keys → 2. Install Extension → 3. Configure Settings → 4. Ready to Use!
```

### **Daily Usage** (2-3 minutes per post)

```
1. Open Extension → 2. Scan Gmail → 3. Select Certificate → 4. Generate Post → 5. Post to Social Media
```

## 📋 Step-by-Step User Journey

### **Phase 1: Initial Setup**

#### Step 1: Get Your API Keys
**Time**: 5-7 minutes

1. **OpenAI API Key** (Required for AI posts)
   - Visit: https://platform.openai.com/api-keys
   - Sign in/Create account
   - Click "Create new secret key"
   - Copy the key (looks like: `sk-1234567890abcdef...`)

2. **Twitter Bearer Token** (Required for posting)
   - Visit: https://developer.twitter.com/en/portal/dashboard
   - Create app or use existing
   - Go to "Keys and tokens" tab
   - Generate "Bearer Token"
   - Copy the token

3. **Google Client ID** (Required for Gmail access)
   - Visit: https://console.cloud.google.com/
   - Create new project
   - Enable Gmail API
   - Create OAuth 2.0 credentials
   - Copy the Client ID

#### Step 2: Install Extension
**Time**: 2 minutes

1. Download the extension files
2. Open Chrome → Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the extension folder
6. Note your extension ID (you'll need this)

#### Step 3: Configure Google Client ID
**Time**: 1 minute

1. Go back to Google Cloud Console
2. Edit your OAuth 2.0 Client ID
3. Add your extension ID to authorized origins
4. Save changes

#### Step 4: Configure Extension Settings
**Time**: 2 minutes

1. Click the Postify extension icon in Chrome
2. Click the Settings (gear) icon
3. Enter your API keys:
   - **Google Client ID**: Your OAuth 2.0 Client ID
   - **OpenAI API Key**: Your OpenAI secret key
   - **Twitter Bearer Token**: Your Twitter Bearer token
4. Click "Save Settings"

### **Phase 2: Daily Usage**

#### Step 1: Open Extension
- Click the Postify extension icon in Chrome toolbar
- You'll see the main interface

#### Step 2: Sign in with Google (First time only)
- Click "Sign in with Google"
- Grant Gmail access permissions
- You'll see "Connected as [your name]"

#### Step 3: Scan for Certificates
- The extension automatically scans your Gmail
- Or click "Scan Gmail" to manually scan
- Certificates will appear in the list

#### Step 4: Select a Certificate
- Click on any certificate from the list
- You'll see certificate details
- Click "Generate Post" button

#### Step 5: Generate Post
- Choose platform (LinkedIn/Twitter)
- Select tone (Professional/Casual/Excited)
- Add custom message (optional)
- Click "Generate Post"
- Review the AI-generated content

#### Step 6: Post to Social Media
- Click "Use This Post"
- Choose platform to post to
- Click "Post to [Platform]"
- Your post will be published!

#### Step 7: Save as Draft (Optional)
- Instead of posting immediately, click "Save"
- Post will be saved for later use

## 🎨 What You'll See

### **Main Interface**
- **Header**: Extension name and settings button
- **Navigation**: Certificates, Generate, Post tabs
- **Certificate List**: All found certificates
- **Footer**: Certificate count and sign out

### **Certificate View**
- Certificate title and issuer
- Date received
- Skills extracted
- Generate post button

### **Post Generator**
- Platform selection (LinkedIn/Twitter)
- Tone selection (Professional/Casual/Excited)
- Custom message field
- Generate button
- Generated post preview

### **Post Publisher**
- Generated post content
- Platform selection
- Post button
- Save draft option

## 🔍 What the Extension Finds

The extension searches your Gmail for emails containing:
- "certificate" or "certification"
- "course completion" or "training completed"
- "diploma" or "achievement"
- "you have completed"

## ✨ What It Creates

### **LinkedIn Posts** (Professional)
- 1300-1600 characters
- Professional tone
- 3-5 relevant hashtags
- Skills and achievements focus

### **Twitter Posts** (Concise)
- Under 280 characters
- Engaging and shareable
- 1-3 hashtags
- Achievement-focused

## 🛠️ Troubleshooting

### **Common Issues**

1. **"Google Client ID not configured"**
   - Go to Settings and enter your Google Client ID
   - Make sure you've added your extension ID to Google Cloud Console

2. **"OpenAI API key not configured"**
   - Go to Settings and enter your OpenAI API key
   - Ensure the key starts with `sk-`

3. **"Gmail access denied"**
   - Re-authenticate with Google
   - Check that Gmail API is enabled
   - Verify your Google Client ID is correct

4. **"Twitter posting failed"**
   - Verify your Twitter Bearer token in Settings
   - Ensure the token has write permissions

5. **"No certificates found"**
   - Check that you have certificate emails in Gmail
   - Make sure you're signed in with the correct Gmail account

### **Debug Mode**
- Right-click extension icon → "Inspect popup"
- Check Console tab for error messages
- Verify Network tab for API calls

## ⚡ Pro Tips

1. **Batch Processing**: Generate multiple posts at once
2. **Custom Messages**: Add personal context to posts
3. **Draft Saving**: Save posts for later review
4. **Tone Matching**: Use different tones for different platforms
5. **Regular Scanning**: Enable auto-scan for new certificates

## 🔒 Privacy & Security

- **Local Storage**: All data stored on your device
- **No Server Data**: Nothing sent to external servers
- **Secure Keys**: API keys stored securely in Chrome
- **Gmail Only**: Only scans for certificate-related emails

## 📊 Time Investment

- **Initial Setup**: 10-15 minutes (one-time)
- **Daily Usage**: 2-3 minutes per post
- **Weekly**: 10-15 minutes total

## 🎯 Best Practices

1. **Regular Scanning**: Scan Gmail weekly for new certificates
2. **Post Timing**: Post during business hours for better engagement
3. **Content Review**: Always review AI-generated posts before publishing
4. **Hashtag Usage**: Use relevant hashtags for better reach
5. **Consistent Posting**: Maintain regular posting schedule

---

## 🚀 Ready to Get Started?

1. Follow the setup guide in SETUP_GUIDE.md
2. Configure your API keys
3. Start scanning your Gmail
4. Generate your first AI-powered post!

**Need help?** Check the troubleshooting section or review the main README.md 