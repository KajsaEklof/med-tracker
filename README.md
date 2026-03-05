# MedTracker - Child Medication Log PWA

A simple Progressive Web App for tracking paracetamol and ibuprofen doses for your child. Built with HTML, JavaScript, and Supabase.

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

- **Frontend**: HTML, CSS, JavaScript
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

1. Copy `config.example` to `config.js`
2. Open `config.js`
3. Replace the placeholder values with your actual Supabase credentials:

```javascript
const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    COMNOCO_API_KEY: 'your-comnoco-api-key-here'
};
```

### 4.5 Comnoco Integration

Comnoco is a no-code platform used in this project to securely store your Supabase account secret. This allows the application to automatically restore your Supabase project if the database has been paused due to inactivity.

**Why Comnoco?**
- Supabase free tier databases are paused after 7 days of inactivity
- The account secret (different from the anon key) is needed to unpause the database via API
- Storing secrets securely in client-side code is challenging; Comnoco provides a secure backend service

**Setting up Comnoco:**
1. Create a free account at [comnoco.com](https://comnoco.com)
2. Create a new workflow that can make API calls to Supabase
3. Store your Supabase account secret in Comnoco's secure storage
4. Generate an API key for your workflow
5. Add the API key to `config.js` as `COMNOCO_API_KEY`

This ensures your app can automatically handle database restoration without manual intervention.

### 6. Create App Icons

You'll need two icon files for the PWA to work properly:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

You can create these using any image editor. For a simple icon, you can use the 💊 emoji or create a custom medical-themed icon.

Quick way to create icons:
1. Go to [favicon.io](https://favicon.io/emoji-favicons/pill/)
2. Download the pill emoji favicon
3. Resize to 192x192 and 512x512 using an image editor

### 7. Register the Service Worker

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

### 8. Deploy to GitHub Pages

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

### 9. Configure GitHub Pages for PWA

If deploying to a subdirectory (like `/medtracker/`), update these files:

**manifest.json:**
```json
"start_url": "/medtracker/",
```

**app.js** (if needed for routing):
Add base path handling if you encounter issues with links.

## Important Medical Disclaimer

⚠️ **This app is a tracking tool only and does not provide medical advice.**

- Always consult your doctor or pharmacist for proper dosing based on your child's age and weight
- The minimum intervals and maximum doses shown are general guidelines
- If your child's symptoms persist or worsen, seek medical attention
- Never exceed the recommended dose without medical advice
- Keep all medications out of reach of children

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