console.log('📝 app.js file is being parsed...');

// Supabase Configuration - loaded from config.js
const SUPABASE_URL = window.CONFIG?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.CONFIG?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

console.log('🔧 Config loaded:', { 
    hasConfig: !!window.CONFIG, 
    url: SUPABASE_URL,
    hasKey: SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY'
});

let supabaseClient;
let currentUser = null;
let currentChild = null;

// Initialize Supabase
function initSupabase() {
    if (!SUPABASE_URL === "YOUR_SUPABASE_URL" || !SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
        console.error('Please configure your Supabase credentials in app.js');
        showError('login-error', 'Supabase not configured. Please check app.js');
        return false;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

// Initialize app
async function init() {
    if (!initSupabase()) return;
    
    // Check if user is logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showMainScreen();
    } else {
        showAuthScreen();
    }
    
    // Set up auth state listener
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showMainScreen();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuthScreen();
        }
    });
    
    // Set up form handlers
    setupFormHandlers();
    
    // Set up real-time subscriptions when user is logged in
    if (session) {
        setupRealtimeSubscriptions();
    }
}

// Show/Hide screens
function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    loadChildren();
}

// Auth functions
function switchTab(tab) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (tab === 'login') {
        loginForm.classList.add('active');
        signupForm.classList.remove('active');
        tabBtns[0].classList.add('active');
        tabBtns[1].classList.remove('active');
    } else {
        signupForm.classList.add('active');
        loginForm.classList.remove('active');
        tabBtns[1].classList.add('active');
        tabBtns[0].classList.remove('active');
    }
}
window.switchTab = switchTab;

// Logout
async function logout() {
    await supabaseClient.auth.signOut();
    currentChild = null;
}
window.logout = logout;

// Modal functions
function showAddChildModal() {
    document.getElementById('add-child-modal').classList.add('active');
    document.getElementById('add-child-form').reset();
}
window.showAddChildModal = showAddChildModal;

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
window.closeModal = closeModal;

function showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    document.getElementById('current-user-email').textContent = currentUser.email;
}
window.showSettings = showSettings;

function backToChildSelection() {
    currentChild = null;
    document.getElementById('child-select-section').style.display = 'block';
    document.getElementById('tracking-section').style.display = 'none';
}
window.backToChildSelection = backToChildSelection;

function showAddDoseModal(medication) {
    document.getElementById('add-dose-modal').classList.add('active');
    document.getElementById('dose-modal-title').textContent = `Add ${capitalize(medication)} Dose`;
    document.getElementById('dose-medication').value = medication;
    
    // Set current time
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localTime = new Date(now.getTime() - (offset * 60 * 1000));
    document.getElementById('dose-time').value = localTime.toISOString().slice(0, 16);
    
    document.getElementById('add-dose-form').reset();
    document.getElementById('dose-medication').value = medication;
    document.getElementById('dose-time').value = localTime.toISOString().slice(0, 16);
}
window.showAddDoseModal = showAddDoseModal;

async function deleteDose(doseId) {
    if (!confirm('Are you sure you want to delete this dose?')) {
        return;
    }
    
    const { error } = await supabaseClient
        .from('doses')
        .delete()
        .eq('id', doseId);
    
    if (error) {
        console.error('Error deleting dose:', error);
        alert('Error deleting dose. Please try again.');
        return;
    }
    
    await loadDoses();
}
window.deleteDose = deleteDose;

async function selectChild(childId) {
    const { data: child, error } = await supabaseClient
        .from('children')
        .select('*')
        .eq('id', childId)
        .single();
    
    if (error) {
        console.error('Error loading child:', error);
        return;
    }
    
    currentChild = child;
    showTrackingSection();
}
window.selectChild = selectChild;

async function shareAccess() {
    const email = document.getElementById('share-email').value;
    
    if (!email || !currentChild) {
        alert('Please enter an email address');
        return;
    }
    
    // Get the user ID of the person to share with
    const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
    
    if (profileError || !profiles) {
        alert('User not found. They need to create an account first.');
        return;
    }
    
    // Update the child's shared_with array
    const currentShared = currentChild.shared_with || [];
    if (currentShared.includes(profiles.id)) {
        alert('This child is already shared with that user.');
        return;
    }
    
    const { error } = await supabaseClient
        .from('children')
        .update({ shared_with: [...currentShared, profiles.id] })
        .eq('id', currentChild.id);
    
    if (error) {
        console.error('Error sharing access:', error);
        alert('Error sharing access. Please try again.');
        return;
    }
    
    alert(`Access shared with ${email}`);
    document.getElementById('share-email').value = '';
}
window.shareAccess = shareAccess;

// Setup form handlers
function setupFormHandlers() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        if (error) {
            showError('login-error', error.message);
        }
    });
    
    // Signup form
    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });
        
        if (error) {
            showError('signup-error', error.message);
        } else {
            showError('signup-error', 'Account created! Please check your email to verify.', 'success');
        }
    });
    
    // Add child form
    document.getElementById('add-child-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addChild();
    });
    
    // Add dose form
    document.getElementById('add-dose-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDose();
    });
}

// Children functions
async function loadChildren() {
    const { data: children, error } = await supabaseClient
        .from('children')
        .select('*')
        .or(`created_by.eq.${currentUser.id},shared_with.cs.{${currentUser.id}}`)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error loading children:', error);
        return;
    }
    
    displayChildren(children);
}

function displayChildren(children) {
    const container = document.getElementById('children-list');
    
    if (children.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No children added yet. Click "Add Child" to get started.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = children.map(child => `
        <div class="child-card" onclick="selectChild('${child.id}')">
            <h3>${escapeHtml(child.name)}</h3>
            <div class="child-info">
                ${child.age ? `${child.age} years old` : ''}
                ${child.age && child.weight ? ' • ' : ''}
                ${child.weight ? `${child.weight}kg` : ''}
            </div>
        </div>
    `).join('');
}

async function addChild() {
    const name = document.getElementById('child-name').value;
    const weight = document.getElementById('child-weight').value;
    const age = document.getElementById('child-age').value;
    
    const { data, error } = await supabaseClient
        .from('children')
        .insert([{
            name,
            weight: weight ? parseFloat(weight) : null,
            age: age ? parseFloat(age) : null,
            created_by: currentUser.id
        }])
        .select();
    
    if (error) {
        console.error('Error adding child:', error);
        alert('Error adding child. Please try again.');
        return;
    }
    
    closeModal('add-child-modal');
    loadChildren();
}

// Tracking section
async function showTrackingSection() {
    document.getElementById('child-select-section').style.display = 'none';
    document.getElementById('tracking-section').style.display = 'block';
    document.getElementById('current-child-name').textContent = currentChild.name;
    
    await loadDoses();
    updateStatus();
}

async function loadDoses() {
    const { data: doses, error } = await supabaseClient
        .from('doses')
        .select(`
            *,
            profiles:given_by (name)
        `)
        .eq('child_id', currentChild.id)
        .order('given_at', { ascending: false })
        .limit(20);
    
    if (error) {
        console.error('Error loading doses:', error);
        return;
    }
    
    displayDoses(doses);
    updateStatusCards(doses);
}

function displayDoses(doses) {
    const container = document.getElementById('doses-list');
    
    if (doses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No doses recorded yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = doses.map(dose => {
        const givenAt = new Date(dose.given_at);
        const timeAgo = getTimeAgo(givenAt);
        const formattedTime = formatDateTime(givenAt);
        
        return `
            <div class="dose-item ${dose.medication}">
                <div class="dose-info-left">
                    <div class="dose-medication ${dose.medication}">${capitalize(dose.medication)}</div>
                    <div class="dose-amount">${dose.amount}${dose.unit || 'ml'}</div>
                    <div class="dose-time">${formattedTime} (${timeAgo})</div>
                    ${dose.notes ? `<div class="dose-notes">${escapeHtml(dose.notes)}</div>` : ''}
                    <div class="dose-by">Given by ${escapeHtml(dose.profiles?.name || 'Unknown')}</div>
                </div>
                <div class="dose-actions">
                    <button class="btn-delete" onclick="deleteDose('${dose.id}')" title="Delete">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2m3 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V6h10z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateStatusCards(doses) {
    const now = new Date();
    const paraDoses = doses.filter(d => d.medication === 'paracetamol');
    const ibuDoses = doses.filter(d => d.medication === 'ibuprofen');
    
    updateMedicationStatus('para', paraDoses, 4 * 60); // 4 hours in minutes
    updateMedicationStatus('ibu', ibuDoses, 6 * 60); // 6 hours in minutes
}

function updateMedicationStatus(prefix, doses, minIntervalMinutes) {
    const now = new Date();
    
    if (doses.length === 0) {
        document.getElementById(`${prefix}-time-since`).textContent = 'No doses recorded';
        document.getElementById(`${prefix}-next-dose`).textContent = '';
        document.getElementById(`${prefix}-add-btn`).disabled = false;
        return;
    }
    
    const lastDose = doses[0];
    const lastDoseTime = new Date(lastDose.given_at);
    const minutesSince = Math.floor((now - lastDoseTime) / (1000 * 60));
    const hoursFloat = minutesSince / 60;
    
    // Update time since last dose
    document.getElementById(`${prefix}-time-since`).textContent = formatTimeSince(minutesSince);
    
    // Update next dose info
    const nextDoseElement = document.getElementById(`${prefix}-next-dose`);
    const addButton = document.getElementById(`${prefix}-add-btn`);
    
    if (minutesSince >= minIntervalMinutes) {
        nextDoseElement.textContent = '✓ Safe to give another dose';
        nextDoseElement.className = 'next-dose ready';
        addButton.disabled = false;
    } else {
        const minutesRemaining = minIntervalMinutes - minutesSince;
        nextDoseElement.textContent = `Next dose in ${formatTimeSince(minutesRemaining)}`;
        nextDoseElement.className = 'next-dose';
        addButton.disabled = true;
    }
    
    // Count doses in last 24 hours
    const last24Hours = doses.filter(d => {
        const doseTime = new Date(d.given_at);
        return (now - doseTime) < (24 * 60 * 60 * 1000);
    });
    
    const maxDoses = prefix === 'para' ? 4 : 3;
    
    // Create dose indicator circles
    const doseCount = last24Hours.length;
    const circles = [];
    for (let i = 0; i < maxDoses; i++) {
        const filled = i < doseCount ? 'filled' : '';
        circles.push(`<div class="dose-circle ${filled} ${prefix === 'para' ? 'paracetamol' : 'ibuprofen'}"></div>`);
    }
    
    document.getElementById(`${prefix}-dose-info`).innerHTML = `
        <div class="dose-indicators">
            ${circles.join('')} (${last24Hours.length} of ${maxDoses} in 24h)
        </div>
    `;
    // document.getElementById(`${prefix}-dose-info`).textContent = `${last24Hours.length}/${maxDoses} in 24h`;
}

function updateStatus() {
    // This will be called periodically to update the time displays
    if (currentChild) {
        loadDoses();
    }
}

// Start periodic updates
setInterval(updateStatus, 60000); // Update every minute

// Dose functions - addDose is defined with form handler
async function addDose() {
    const medication = document.getElementById('dose-medication').value;
    const amount = document.getElementById('dose-amount').value;
    const givenAt = document.getElementById('dose-time').value;
    const notes = document.getElementById('dose-notes').value;
    
    const { data, error } = await supabaseClient
        .from('doses')
        .insert([{
            child_id: currentChild.id,
            medication,
            amount: parseFloat(amount),
            unit: 'ml',
            given_at: new Date(givenAt).toISOString(),
            notes: notes || null,
            given_by: currentUser.id
        }])
        .select();
    
    if (error) {
        console.error('Error adding dose:', error);
        alert('Error adding dose. Please try again.');
        return;
    }
    
    closeModal('add-dose-modal');
    await loadDoses();
}

// Setup real-time subscriptions
function setupRealtimeSubscriptions() {
    if (!currentUser) return;
    
    // Subscribe to changes in doses
    supabaseClient
        .channel('doses_changes')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'doses'
            }, 
            (payload) => {
                if (currentChild && payload.new?.child_id === currentChild.id) {
                    loadDoses();
                }
            }
        )
        .subscribe();
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Utility functions
function showError(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.classList.add('active');
    
    if (type === 'success') {
        element.style.background = '#dcfce7';
        element.style.color = '#166534';
    }
    
    setTimeout(() => {
        element.classList.remove('active');
        element.style.background = '';
        element.style.color = '';
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimeSince(minutes) {
    if (minutes < 60) {
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours < 24) {
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    return formatDateTime(date);
}

function formatDateTime(date) {
    return date.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Initialize app when DOM is ready
console.log('🚀 Script file loaded, about to initialize...');

if (document.readyState === 'loading') {
    console.log('⏳ DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOMContentLoaded fired, calling init()');
        init().catch(err => console.error('Init error:', err));
    });
} else {
    console.log('✅ DOM already ready, calling init() immediately');
    init().catch(err => console.error('Init error:', err));
}