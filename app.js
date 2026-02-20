// Supabase Configuration - loaded from config.js
const SUPABASE_URL = window.CONFIG?.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = window.CONFIG?.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient;
let currentUser = null;
let currentChild = null;

// ─── Initialisation ───────────────────────────────────────────────────────────

function initSupabase() {
    if (!SUPABASE_URL === "YOUR_SUPABASE_URL" || !SUPABASE_ANON_KEY === "YOUR_SUPABASE_ANON_KEY") {
        console.error('Please configure your Supabase credentials in app.js');
        showError('login-error', 'Supabase not configured. Please check app.js');
        return false;
    }
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
}

async function init() {
    if (!initSupabase()) return;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showMainScreen();
    } else {
        showAuthScreen();
    }
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            currentUser = session.user;
            showMainScreen();
        } else if (event === 'SIGNED_OUT') {
            currentUser = null;
            showAuthScreen();
        }
    });
    
    setupEventListeners();
    
    if (session) {
        setupRealtimeSubscriptions();
    }
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

function setupEventListeners() {
    // Tabs
    document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
    document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

    // Auth screen
    document.getElementById('logo-icon').addEventListener('click', secretTap);
    document.getElementById('restore-btn').addEventListener('click', restoreProject);

    // Main screen header
    document.getElementById('settings-btn').addEventListener('click', showSettings);
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Child selection
    document.getElementById('add-child-btn').addEventListener('click', showAddChildModal);
    document.getElementById('back-btn').addEventListener('click', backToChildSelection);

    // Medication add dose buttons
    document.getElementById('para-add-btn').addEventListener('click', () => showAddDoseModal('paracetamol'));
    document.getElementById('ibu-add-btn').addEventListener('click', () => showAddDoseModal('ibuprofen'));

    // Settings
    document.getElementById('share-access-btn').addEventListener('click', shareAccess);

    // Close modals via data-modal attribute (handles all close/cancel buttons)
    document.querySelectorAll('[data-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.modal));
    });

    // Close modals when clicking the backdrop
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // Forms
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) showError('login-error', error.message);
    });

    document.getElementById('signup-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { name } }
        });
        if (error) {
            showError('signup-error', error.message);
        } else {
            showError('signup-error', 'Account created! Please check your email to verify.', 'success');
        }
    });

    document.getElementById('add-child-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addChild();
    });

    document.getElementById('add-dose-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await addDose();
    });
}

// ─── Secret Tap & Restore ─────────────────────────────────────────────────────

let tapCount = 0;
let tapTimer;

function secretTap() {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 2000);
    if (tapCount >= 5) {
        tapCount = 0;
        showRestoreButton();
    }
}

function showRestoreButton() {
    document.getElementById('restore-btn').style.display = 'block';
}

async function restoreProject() {
    const btn = document.getElementById('restore-btn');
    btn.textContent = '⏳ Restoring...';
    btn.disabled = true;

    const resp = await fetch('https://trigger.comnoco.com/t/d1d6b0da-3b86-486c-a660-904a79e18ecb/Supabase-Restore-Project', {
        method: 'GET',
        headers: {
            'API-KEY': window.CONFIG?.COMNOCO_API_KEY || 'COMNOCO_API_KEY_NOT_SET'
        }
    });

    const respBody = await resp.json();
    console.log('🔄 Restore API response status:', resp.status);
    console.log('🔄 Restore API response body:', respBody);

    btn.textContent = '✅ Restoring Complete';
}

// ─── Screen Navigation ────────────────────────────────────────────────────────

function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('main-screen').style.display = 'none';
}

function showMainScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    loadChildren();

    // Reinitialise icons for the main screen
    lucide.createIcons();
}

function backToChildSelection() {
    currentChild = null;
    document.getElementById('child-select-section').style.display = 'block';
    document.getElementById('tracking-section').style.display = 'none';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

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

async function logout() {
    await supabaseClient.auth.signOut();
    currentChild = null;
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function showAddChildModal() {
    document.getElementById('add-child-modal').classList.add('active');
    document.getElementById('add-child-form').reset();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showSettings() {
    document.getElementById('settings-modal').classList.add('active');
    document.getElementById('current-user-email').textContent = currentUser.email;
}

function showAddDoseModal(medication) {
    document.getElementById('add-dose-modal').classList.add('active');
    document.getElementById('dose-modal-title').textContent = `Add ${capitalize(medication)} Dose`;
    document.getElementById('dose-medication').value = medication;

    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localTime = new Date(now.getTime() - (offset * 60 * 1000));
    document.getElementById('add-dose-form').reset();
    document.getElementById('dose-medication').value = medication;
    document.getElementById('dose-time').value = localTime.toISOString().slice(0, 16);
}

// ─── Children ─────────────────────────────────────────────────────────────────

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
        <div class="child-card" data-child-id="${child.id}">
            <h3><i data-lucide="baby" class=""></i>${escapeHtml(child.name)}</h3>
            <div class="child-info">
                ${child.age ? `${child.age} years old` : ''}
                ${child.age && child.weight ? ' • ' : ''}
                ${child.weight ? `${child.weight}kg` : ''}
            </div>
        </div>
    `).join('');

    // Attach click listeners to each child card
    container.querySelectorAll('.child-card').forEach(card => {
        card.addEventListener('click', () => selectChild(card.dataset.childId));
    });

      // After rendering, reinitialise icons
    lucide.createIcons(); 
}

async function addChild() {
    const name = document.getElementById('child-name').value;
    // const weight = document.getElementById('child-weight')?.value;
    // const age = document.getElementById('child-age')?.value;

    const { error } = await supabaseClient
        .from('children')
        .insert([{
            name,
            // weight: weight ? parseFloat(weight) : null,
            // age: age ? parseFloat(age) : null,
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

// ─── Sharing ──────────────────────────────────────────────────────────────────

async function shareAccess() {
    const email = document.getElementById('share-email').value;

    if (!email || !currentChild) {
        alert('Please enter an email address');
        return;
    }

    const { data: profiles, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError || !profiles) {
        alert('User not found. They need to create an account first.');
        return;
    }

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

// ─── Tracking ─────────────────────────────────────────────────────────────────

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
        .select(`*, profiles:given_by (name)`)
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
        return `
            <div class="dose-item ${dose.medication}">
                <div class="dose-info-left">
                    <div class="dose-medication ${dose.medication}">${capitalize(dose.medication)}</div>
                    <div class="dose-amount">${dose.amount}${dose.unit || 'ml'}</div>
                    <div class="dose-time">${formatDateTime(givenAt)} (${getTimeAgo(givenAt)})</div>
                    ${dose.notes ? `<div class="dose-notes">${escapeHtml(dose.notes)}</div>` : ''}
                    <div class="dose-by">Given by ${escapeHtml(dose.profiles?.name || 'Unknown')}</div>
                </div>
                <div class="dose-actions">
                    <button class="btn-delete" data-dose-id="${dose.id}" title="Delete">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    // Attach delete listeners after rendering
    container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteDose(btn.dataset.doseId));
    });

    // After rendering, reinitialise icons
    lucide.createIcons();
}

function updateStatusCards(doses) {
    const paraDoses = doses.filter(d => d.medication === 'paracetamol');
    const ibuDoses = doses.filter(d => d.medication === 'ibuprofen');
    updateMedicationStatus('para', paraDoses, 4 * 60);
    updateMedicationStatus('ibu', ibuDoses, 6 * 60);
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

    document.getElementById(`${prefix}-time-since`).textContent = formatTimeSince(minutesSince);

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

    const last24Hours = doses.filter(d => (now - new Date(d.given_at)) < (24 * 60 * 60 * 1000));
    const maxDoses = prefix === 'para' ? 4 : 3;
    const circles = Array.from({ length: maxDoses }, (_, i) => {
        const filled = i < last24Hours.length ? 'filled' : '';
        return `<div class="dose-circle ${filled} ${prefix === 'para' ? 'paracetamol' : 'ibuprofen'}"></div>`;
    });

    document.getElementById(`${prefix}-dose-info`).innerHTML = `
        <div class="dose-indicators">
            ${circles.join('')} (${last24Hours.length} of ${maxDoses} in 24h)
        </div>
    `;
}

function updateStatus() {
    if (currentChild) loadDoses();
}

setInterval(updateStatus, 60000);

// ─── Doses ────────────────────────────────────────────────────────────────────

async function addDose() {
    const medication = document.getElementById('dose-medication').value;
    const amount = document.getElementById('dose-amount').value;
    const givenAt = document.getElementById('dose-time').value;
    const notes = document.getElementById('dose-notes').value;

    const { error } = await supabaseClient
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

async function deleteDose(doseId) {
    if (!confirm('Are you sure you want to delete this dose?')) return;

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

// ─── Realtime ─────────────────────────────────────────────────────────────────

function setupRealtimeSubscriptions() {
    if (!currentUser) return;

    supabaseClient
        .channel('doses_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'doses' },
            (payload) => {
                if (currentChild && payload.new?.child_id === currentChild.id) {
                    loadDoses();
                }
            }
        )
        .subscribe();
}

// ─── Utilities ────────────────────────────────────────────────────────────────

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
    if (minutes < 60) return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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

// ─── Boot ─────────────────────────────────────────────────────────────────────

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init().catch(console.error));
} else {
    init().catch(console.error);
}