# Quick Start Guide

Follow these steps to get MedTracker up and running in about 15 minutes.

## Step 1: Supabase Setup (5 minutes)

### Create Project
1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Choose a name (e.g., "medtracker")
4. Create a strong database password (save it somewhere safe)
5. Choose a region close to you
6. Click "Create new project" and wait ~2 minutes

### Set Up Database
1. In the left sidebar, click "SQL Editor"
2. Click "New Query"
3. Open the `supabase-schema.sql` file from this project
4. Copy ALL the SQL code
5. Paste it into the SQL Editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

### Get Your API Keys
1. Click on the "Settings" icon (gear) in the left sidebar
2. Click "API" under Project Settings
3. Find these two values and copy them:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

## Step 2: Configure the App (2 minutes)

1. Open `app.js` in a text editor
2. Find these lines at the top (around line 2-3):
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

3. Replace with your actual values:
```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGc...'; // your long key
```

4. Save the file

## Step 3: Create App Icons (3 minutes)

### Option A: Use Emoji Icons (Easiest)
1. Go to https://favicon.io/emoji-favicons/pill/
2. Click "Download"
3. Unzip the downloaded file
4. Rename these files and add to your project:
   - `android-chrome-192x192.png` → `icon-192.png`
   - `android-chrome-512x512.png` → `icon-512.png`

### Option B: Create Custom Icons
1. Create a 512x512 pixel image with your design
2. Use an online tool like https://www.resizeimage.net/ to create:
   - 192x192 version (save as `icon-192.png`)
   - 512x512 version (save as `icon-512.png`)

## Step 4: Test Locally (2 minutes)

You need a local web server (can't just open index.html in browser).

### Option A: Using Python
```bash
# If you have Python 3
python3 -m http.server 8000

# If you have Python 2
python -m SimpleHTTPServer 8000
```

### Option B: Using Node.js
```bash
npx http-server
```

### Option C: Using VS Code
1. Install "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

Then open http://localhost:8000 in your browser.

## Step 5: Deploy to GitHub Pages (3 minutes)

### Create GitHub Repository
1. Go to https://github.com and login
2. Click the "+" icon → "New repository"
3. Name it (e.g., "medtracker")
4. Keep it Public
5. DON'T initialize with README (we already have one)
6. Click "Create repository"

### Push Your Code
```bash
# In your project directory
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medtracker.git
git push -u origin main
```

### Enable GitHub Pages
1. In your GitHub repository, click "Settings"
2. Click "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. Wait ~1 minute for deployment
5. Your app will be live at: `https://YOUR_USERNAME.github.io/medtracker/`

## Step 6: Optional Configuration

### Disable Email Confirmation (Recommended for quick testing)
By default, Supabase requires email confirmation. To disable:

1. Go to your Supabase dashboard
2. Click "Authentication" in the left sidebar
3. Click "Settings"
4. Scroll to "Email Auth"
5. Toggle OFF "Enable email confirmations"
6. Click "Save"

Now you can sign up without confirming your email!

### Enable Real-time (Should be on by default)
1. In Supabase, click "Database" → "Replication"
2. Make sure "doses" table has replication enabled
3. This allows instant syncing between devices

## Troubleshooting

### "Supabase not configured" error
- Double-check you copied the FULL URL and key from Supabase
- Make sure you saved `app.js` after editing
- Clear browser cache and refresh

### Can't sign up or login
- Check if email confirmation is enabled (see Optional Configuration above)
- Check your browser console (F12) for errors
- Make sure the database schema was run successfully

### Page shows but nothing works
- Open browser console (F12) and check for errors
- Most common: Wrong Supabase credentials
- Check that all files are in the same directory

### Icons not showing
- Make sure `icon-192.png` and `icon-512.png` are in the root directory
- File names must match exactly (case-sensitive)
- Try clearing browser cache

## Next Steps

1. **Create your account** on the deployed app
2. **Add your first child** with their details
3. **Share access** with your partner (they need to create an account first)
4. **Start tracking doses** when needed

## Need Help?

- Check the full README.md for detailed information
- Supabase docs: https://supabase.com/docs
- GitHub Pages docs: https://docs.github.com/en/pages

---

**You're done! 🎉**

The app is now live and ready to use. Bookmark it on your phone and add it to your home screen for quick access!