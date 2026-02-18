# MedTracker - Child Medication Log PWA

A simple Progressive Web App for tracking paracetamol and ibuprofen doses for your child. Built with HTML, htmx, JavaScript, and Supabase.

## Features

- ✅ **Multi-user support** - Share medication logs with your partner or caregiver
- 💊 **Track multiple medications** - Paracetamol and Ibuprofen tracking
- ⏰ **Time tracking** - See when the last dose was given and when the next is safe
- 📱 **Progressive Web App** - Install on your phone for quick access
- 🔄 **Real-time sync** - Changes sync instantly between users
- 🔐 **Secure authentication** - Email/password auth via Supabase
- 📊 **24-hour dose tracking** - See how many doses given in the last 24 hours
- 📝 **Notes support** - Add notes to each dose (e.g., "After dinner")
- 👥 **Multiple children** - Track medication for multiple children

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript, htmx
- **Backend**: Supabase (PostgreSQL database + Authentication)
- **Hosting**: GitHub Pages
- **PWA**: Service Worker for offline support

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be set up (takes ~2 minutes)

### 2. Set Up the Database

1. In your Supabase project, go to the **SQL Editor**
2. Copy the contents of `supabase-schema.sql`
3. Paste it into the SQL Editor and click **Run**
4. This will create all necessary tables, policies, and triggers

### 3. Get Your Supabase Credentials

1. Go to **Project Settings** > **API**
2. Copy your **Project URL** (looks like `https://xxxxx.supabase.co`)
3. Copy your **anon/public** API key (starts with `eyJ...`)

### 4. Configure the App

1. Open `app.js`
2. Replace the placeholder values at the top:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

### 5. Create App Icons

You'll need two icon files for the PWA to work properly:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

You can create these using any image editor. For a simple icon, you can use the 💊 emoji or create a custom medical-themed icon.

Quick way to create icons:
1. Go to [favicon.io](https://favicon.io/emoji-favicons/pill/)
2. Download the pill emoji favicon
3. Resize to 192x192 and 512x512 using an image editor

### 6. Register the Service Worker

Add this script tag to your `index.html` before the closing `</body>` tag:

```html
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered', reg))
        .catch(err => console.log('Service Worker registration failed', err));
}
</script>
```

### 7. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push your code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/medtracker.git
git push -u origin main
```

3. Go to your repository **Settings** > **Pages**
4. Under **Source**, select **main** branch and **/root** folder
5. Click **Save**
6. Your app will be available at `https://yourusername.github.io/medtracker/`

### 8. Configure GitHub Pages for PWA

If deploying to a subdirectory (like `/medtracker/`), update these files:

**manifest.json:**
```json
"start_url": "/medtracker/",
```

**app.js** (if needed for routing):
Add base path handling if you encounter issues with links.

## Usage

### First Time Setup

1. Visit your deployed app
2. Click "Sign Up" and create an account
3. After signing in, click "Add Child" to add your first child
4. Enter their name, weight (optional), and age (optional)

### Adding a Dose

1. Select your child from the list
2. Click "Add Dose" on either the Paracetamol or Ibuprofen card
3. Enter the amount given and the time (defaults to now)
4. Add any notes if needed (e.g., "After fever check")
5. Click "Save Dose"

### Sharing with Your Partner

1. Have your partner create an account first
2. Click the settings icon (⚙️) in the top right
3. Enter your partner's email in the "Share Access" section
4. Click "Send Invite"
5. Your partner will now see the child in their account

### Safety Features

- **Minimum intervals**: The app prevents adding doses too soon
  - Paracetamol: 4 hours between doses
  - Ibuprofen: 6 hours between doses
- **24-hour tracking**: Shows how many doses given in the last 24 hours
- **Maximum doses**: 
  - Paracetamol: Max 4 doses in 24 hours
  - Ibuprofen: Max 3 doses in 24 hours
- **Visual indicators**: Color-coded cards show when it's safe to give the next dose

## Important Medical Disclaimer

⚠️ **This app is a tracking tool only and does not provide medical advice.**

- Always consult your doctor or pharmacist for proper dosing based on your child's age and weight
- The minimum intervals and maximum doses shown are general guidelines
- If your child's symptoms persist or worsen, seek medical attention
- Never exceed the recommended dose without medical advice
- Keep all medications out of reach of children

## Troubleshooting

### App won't load
- Check that your Supabase credentials are correctly entered in `app.js`
- Check browser console for errors (F12)
- Ensure your Supabase project is active

### Doses not syncing between users
- Make sure both users have shared access (use the Share Access feature)
- Check that real-time subscriptions are enabled in Supabase (Database > Replication)

### Can't install as PWA
- Ensure you're accessing via HTTPS (GitHub Pages uses HTTPS by default)
- Check that `icon-192.png` and `icon-512.png` exist
- Verify `manifest.json` is accessible

### Login not working
- Check that email confirmation is not required in Supabase Auth settings
- Or check your email for confirmation link
- To disable email confirmation: Supabase Dashboard > Authentication > Settings > Enable email confirmations (toggle off)

## File Structure

```
medtracker/
├── index.html          # Main HTML file
├── styles.css          # All styles
├── app.js             # Main application logic
├── sw.js              # Service worker for PWA
├── manifest.json      # PWA manifest
├── supabase-schema.sql # Database schema
├── icon-192.png       # App icon (192x192)
├── icon-512.png       # App icon (512x512)
└── README.md          # This file
```

## Privacy & Security

- All data is stored in your private Supabase database
- Passwords are hashed and never stored in plain text
- Row Level Security (RLS) ensures users can only access their own data and shared children
- Data is encrypted in transit (HTTPS)
- You can delete your account and all data at any time from Supabase

## Customization

### Changing Colors

Edit the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #0f766e;  /* Main theme color */
    --paracetamol: #3b82f6;    /* Paracetamol card color */
    --ibuprofen: #8b5cf6;      /* Ibuprofen card color */
}
```

### Adjusting Time Intervals

Edit the intervals in `app.js`:

```javascript
updateMedicationStatus('para', paraDoses, 4 * 60); // 4 hours
updateMedicationStatus('ibu', ibuDoses, 6 * 60);   // 6 hours
```

### Adding More Medications

1. Add medication type to database schema:
```sql
CHECK (medication IN ('paracetamol', 'ibuprofen', 'your_medication'))
```

2. Add status card in HTML
3. Add update logic in `updateStatusCards()` function

## Contributing

This is a personal project, but suggestions are welcome! Feel free to fork and modify for your own needs.

## License

MIT License - feel free to use and modify for personal use.

## Support

For issues related to:
- **Supabase**: Check [Supabase Documentation](https://supabase.com/docs)
- **GitHub Pages**: Check [GitHub Pages Documentation](https://docs.github.com/en/pages)
- **App Bugs**: Open an issue in the GitHub repository

---

**Remember**: This app is a tool to help track medications, but always consult healthcare professionals for medical decisions regarding your child's health.