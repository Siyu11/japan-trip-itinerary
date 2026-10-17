const { url: supabaseUrl, publishableKey } = window.TRAVEL_SUPABASE;
const cloud = window.supabase.createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const authScreen = document.querySelector('#auth-screen');
const appShell = document.querySelector('#app-shell');
const authForm = document.querySelector('#auth-form');
const authEmail = document.querySelector('#auth-email');
const authPassword = document.querySelector('#auth-password');
const passwordToggle = document.querySelector('#password-toggle');
const authModeButton = document.querySelector('#auth-mode');
const authMessage = document.querySelector('#auth-message');
const accountButton = document.querySelector('#account-button');
const profileDialog = document.querySelector('#profile-dialog');
const profileForm = document.querySelector('#profile-form');
const profileName = document.querySelector('#profile-name');
const profileLocale = document.querySelector('#profile-locale');
const profileCurrency = document.querySelector('#profile-currency');
const profileMessage = document.querySelector('#profile-message');
const profileClose = document.querySelector('#profile-close');
const signoutButton = document.querySelector('#signout-button');
let authMode = 'signin';
let currentUser = null;
let currentProfile = null;
let appLoaded = false;
let saveTimer;

passwordToggle.addEventListener('click', () => {
  const showing = authPassword.type === 'text';
  authPassword.type = showing ? 'password' : 'text';
  passwordToggle.setAttribute('aria-pressed', String(!showing));
  passwordToggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
  authPassword.focus();
});

const stateKeys = ['japan-2026-selected-day', 'japan-2026-preparation-checklist', 'japan-2026-preparation-items', 'japan-2026-visited-stops'];

function collectAppState() {
  return Object.fromEntries(stateKeys.map((key) => [key, localStorage.getItem(key)]));
}

function restoreAppState(state = {}) {
  stateKeys.forEach((key) => {
    if (state[key] === null || state[key] === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, state[key]);
  });
}

async function saveCloudState() {
  if (!currentUser) return;
  const preferences = { ...(currentProfile?.preferences || {}), app_state: collectAppState() };
  const { data, error } = await cloud.from('profiles').update({ preferences }).eq('id', currentUser.id).select().single();
  if (!error) currentProfile = data;
}

window.addEventListener('travel-state-changed', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveCloudState, 350);
});

async function ensureProfile(user) {
  const { data } = await cloud.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (data) return data;
  const { data: created, error } = await cloud.from('profiles').insert({
    id: user.id,
    display_name: user.email?.split('@')[0] || 'Traveler',
    preferences: { app_state: collectAppState() }
  }).select().single();
  if (error) throw error;
  return created;
}

async function ensureDefaultTrip(user) {
  const { data } = await cloud.from('trips').select('id').eq('user_id', user.id).eq('is_default', true).maybeSingle();
  if (data) return;
  await cloud.from('trips').insert({
    user_id: user.id,
    title: 'Nine Days in Japan',
    summary: 'Osaka itinerary in progress; Kawaguchiko, Mount Fuji and Tokyo to be added.',
    status: 'planning', total_days: 9, is_default: true,
    settings: { dates_tentative: true }
  });
}

function loadItineraryApp() {
  if (appLoaded) return;
  appLoaded = true;
  const script = document.createElement('script');
  script.src = 'script.js?v=20261017-3';
  document.body.appendChild(script);
}

async function openApp(session) {
  currentUser = session.user;
  currentProfile = await ensureProfile(currentUser);
  if (currentProfile.preferences?.app_state) restoreAppState(currentProfile.preferences.app_state);
  await ensureDefaultTrip(currentUser);
  profileName.value = currentProfile.display_name || '';
  profileLocale.value = currentProfile.locale || 'zh-CN';
  profileCurrency.value = currentProfile.home_currency || 'CNY';
  authScreen.hidden = true;
  appShell.hidden = false;
  document.body.classList.remove('auth-pending');
  loadItineraryApp();
}

function openAuth() {
  currentUser = null;
  currentProfile = null;
  authScreen.hidden = false;
  appShell.hidden = true;
  document.body.classList.add('auth-pending');
}

authModeButton.addEventListener('click', () => {
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  document.querySelector('#auth-title').textContent = authMode === 'signin' ? 'Sign in' : 'Create account';
  authModeButton.textContent = authMode === 'signin' ? 'Create an account' : 'I already have an account';
  authPassword.autocomplete = authMode === 'signin' ? 'current-password' : 'new-password';
  authMessage.textContent = '';
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  authMessage.textContent = 'Please wait…';
  const credentials = { email: authEmail.value.trim(), password: authPassword.value };
  const result = authMode === 'signin'
    ? await cloud.auth.signInWithPassword(credentials)
    : await cloud.auth.signUp({ ...credentials, options: { emailRedirectTo: `${location.origin}${location.pathname}` } });
  if (result.error) authMessage.textContent = result.error.message;
  else if (authMode === 'signup' && !result.data.session) authMessage.textContent = 'Check your email to confirm your account, then return here to sign in.';
  else if (result.data.session) await openApp(result.data.session);
});

accountButton.addEventListener('click', () => profileDialog.showModal());
profileClose.addEventListener('click', () => profileDialog.close());
profileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  profileMessage.textContent = 'Saving…';
  const { data, error } = await cloud.from('profiles').update({
    display_name: profileName.value.trim(), locale: profileLocale.value, home_currency: profileCurrency.value
  }).eq('id', currentUser.id).select().single();
  if (error) profileMessage.textContent = error.message;
  else { currentProfile = data; profileMessage.textContent = 'Saved'; setTimeout(() => profileDialog.close(), 450); }
});
signoutButton.addEventListener('click', async () => { await saveCloudState(); await cloud.auth.signOut(); profileDialog.close(); openAuth(); });

cloud.auth.onAuthStateChange((_event, session) => {
  if (!session) openAuth();
});

(async () => {
  const { data } = await cloud.auth.getSession();
  if (data.session) await openApp(data.session);
  else openAuth();
})();
