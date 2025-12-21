// Auto-detect base path from current URL
// Extract the directory path (everything before the last /)
// Examples:
//   https://vault.visad.co.uk/notify/ → basePath = '/notify'
//   https://www.safebox.cfd/botm/ → basePath = '/botm'
//   https://example.com/ → basePath = ''
const currentPath = window.location.pathname;
const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
const socketPath = basePath ? `${basePath}/noti/socket.io` : '/noti/socket.io';

console.log('🔍 Path detection:', {
    currentPath,
    basePath,
    socketPath,
    fullSocketURL: `${window.location.origin}${socketPath}`
});

// Connect to the same origin that served this page
// Use polling first for better compatibility with reverse proxies (Apache/cPanel)
// WebSocket will be tried as fallback if polling works
const socket = io(window.location.origin, {
    path: socketPath,
    transports: ['polling', 'websocket'],  // Polling first, then WebSocket
    reconnectionDelay: 1000,
    reconnection: true,
    reconnectionAttempts: 10,
    timeout: 10000
});

// State
let allMessages = [];
let filteredMessages = [];
let currentView = 'all-messages';
let filterKeywords = [];
let soundEnabled = true;
let desktopNotificationsEnabled = false;
let autoRefreshEnabled = true;
let compactMode = false;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const allMessagesBadge = document.getElementById('allMessagesBadge');
const filteredBadge = document.getElementById('filteredBadge');
const todayCount = document.getElementById('todayCount');
const lastUpdate = document.getElementById('lastUpdate');
const allMessagesList = document.getElementById('allMessagesList');
const filteredMessagesList = document.getElementById('filteredMessagesList');
const filterInput = document.getElementById('filterInput');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const activeFilters = document.getElementById('activeFilters');
const soundToggle = document.getElementById('soundToggle');
const soundIcon = document.getElementById('soundIcon');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportBtn = document.getElementById('exportBtn');
const refreshBtn = document.getElementById('refreshBtn');

// View containers
const allMessagesView = document.getElementById('allMessagesView');
const filteredView = document.getElementById('filteredView');
const settingsView = document.getElementById('settingsView');

// Settings elements
const soundEnabledToggle = document.getElementById('soundEnabledToggle');
const desktopNotificationsToggle = document.getElementById('desktopNotifications');
const autoRefreshToggle = document.getElementById('autoRefresh');
const compactModeToggle = document.getElementById('compactMode');
const exportDataBtn = document.getElementById('exportDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const totalMessagesInfo = document.getElementById('totalMessagesInfo');

// Socket Connection
socket.on('connect', () => {
    connectionStatus.classList.add('connected');
    connectionStatus.querySelector('.status-text').textContent = 'Connected';
});

socket.on('disconnect', () => {
    connectionStatus.classList.remove('connected');
    connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
});

// Receive messages from Telegram
socket.on('telegram-alert', (data) => {
    addMessage(data);
    if (soundEnabled) playSound();
    if (desktopNotificationsEnabled) showDesktopNotification(data);
});

// Add message to state
function addMessage(data) {
    allMessages.unshift(data);
    updateStats();
    applyFilter(); // Reapply filter to update filtered view

    if (currentView === 'all-messages') {
        renderAllMessages();
    } else if (currentView === 'filtered') {
        renderFilteredMessages();
    }
}

// Load historical messages from database
async function loadHistoricalMessages() {
    try {
        console.log('📚 Loading historical messages from database...');

        const response = await fetch('/api/notifications?limit=100');
        const data = await response.json();

        allMessages = data.notifications;
        updateStats();
        renderAllMessages();

        console.log(`✅ Loaded ${data.notifications.length} messages from database`);

        if (data.hasMore) {
            showLoadMoreButton();
        }
    } catch (error) {
        console.error('❌ Failed to load historical messages:', error);
        // Show error state
        allMessagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Failed to load messages</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadHistoricalMessages()">
                    Retry
                </button>
            </div>
        `;
    }
}

// Load more messages (pagination)
let currentOffset = 100;
async function loadMoreMessages() {
    try {
        const response = await fetch(`/api/notifications?limit=50&offset=${currentOffset}`);
        const data = await response.json();

        allMessages.push(...data.notifications);
        currentOffset += 50;
        renderAllMessages();

        if (!data.hasMore) {
            hideLoadMoreButton();
        }
    } catch (error) {
        console.error('Failed to load more messages:', error);
    }
}

function showLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    if (container) container.style.display = 'block';
}

function hideLoadMoreButton() {
    const container = document.getElementById('loadMoreContainer');
    if (container) container.style.display = 'none';
}


// Parse visa slot message
function parseVisaSlot(message) {
    const lines = message.split('\n');
    const parsed = {
        country: '',
        location: '',
        slotType: '',
        dates: [],
        link: '',
        flagEmoji: ''
    };

    // Extract country and location from first line (e.g., "🇫🇷 France - Edinburgh")
    const firstLine = lines[0];

    // Match flag emoji (regional indicator symbols) followed by country and location
    // Flag emojis are composed of two regional indicator symbols (U+1F1E6 to U+1F1FF)
    const flagPattern = /([\u{1F1E6}-\u{1F1FF}]{2})\s*([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)/u;
    const countryMatch = firstLine.match(flagPattern);

    if (countryMatch) {
        parsed.flagEmoji = countryMatch[1];
        parsed.country = countryMatch[2].trim();
        parsed.location = countryMatch[3].trim();
    } else {
        // Fallback: try to extract country and location without flag
        const noFlagPattern = /([A-Za-z\s]+)\s*-\s*([A-Za-z\s]+)/;
        const noFlagMatch = firstLine.match(noFlagPattern);
        if (noFlagMatch) {
            parsed.country = noFlagMatch[1].trim();
            parsed.location = noFlagMatch[2].trim();
        }
    }

    // Extract slot type (Prime Time, Regular, etc.)
    const slotTypeMatch = message.match(/▶️\s*([A-Za-z\s]+)/);
    if (slotTypeMatch) {
        parsed.slotType = slotTypeMatch[1].trim();
    }

    // Extract dates and times
    const datePattern = /- (\d{2}\.\d{2}\.\d{4})(.*)/g;
    let match;
    while ((match = datePattern.exec(message)) !== null) {
        const date = match[1];
        const times = match[2].replace(/- /g, '').trim();
        if (date && times) {
            parsed.dates.push({ date, times });
        }
    }

    // Extract link
    const linkMatch = message.match(/Link to visa center site/i);
    if (linkMatch) {
        parsed.link = 'Available'; // In real scenario, extract actual URL
    }

    return parsed;
}

// Render all messages
function renderAllMessages() {
    if (allMessages.length === 0) {
        allMessagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👀</div>
                <h3>Waiting for messages...</h3>
                <p>All messages from VISARD bot will appear here</p>
            </div>
        `;
        return;
    }

    allMessagesList.innerHTML = allMessages.map((msg, index) => createMessageCard(msg, index)).join('');
}

// Render filtered messages
function renderFilteredMessages() {
    if (filterKeywords.length === 0) {
        filteredMessagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No filter applied</h3>
                <p>Enter keywords above to filter visa slot messages</p>
            </div>
        `;
        return;
    }

    if (filteredMessages.length === 0) {
        filteredMessagesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😕</div>
                <h3>No matching messages</h3>
                <p>No messages found matching: <strong>${filterKeywords.join(', ')}</strong></p>
            </div>
        `;
        return;
    }

    filteredMessagesList.innerHTML = filteredMessages.map((msg, index) => createMessageCard(msg, index, true)).join('');
}

// Create message card HTML
function createMessageCard(msg, index, isFiltered = false) {
    const parsed = parseVisaSlot(msg.message);
    const isPrimeTime = parsed.slotType.toLowerCase().includes('prime');
    const isRegular = parsed.slotType.toLowerCase().includes('regular');

    const slotTypeClass = isPrimeTime ? 'prime-time' : isRegular ? 'regular' : '';
    const slotTypeIcon = isPrimeTime ? '⭐' : isRegular ? '📅' : '🎫';

    return `
        <div class="message-card ${slotTypeClass} ${index === 0 && !isFiltered ? 'new' : ''}" data-index="${index}">
            <div class="message-header">
                <div class="message-country">
                    <span class="country-flag">${parsed.flagEmoji || '🌍'}</span>
                    <span class="country-name">${escapeHtml(parsed.country || 'Unknown')}</span>
                </div>
                <div class="message-time">${formatTime(msg.timestamp)}</div>
            </div>

            <div class="message-location">
                <span class="location-icon">📍</span>
                <span>${escapeHtml(parsed.location || msg.group)}</span>
            </div>

            ${parsed.slotType ? `
                <div class="slot-type">
                    <span class="slot-icon">${slotTypeIcon}</span>
                    <span>${escapeHtml(parsed.slotType)}</span>
                </div>
            ` : ''}

            ${parsed.dates.length > 0 ? `
                <div class="dates-section">
                    <div class="dates-header">Available Dates:</div>
                    <div class="dates-list">
                        ${parsed.dates.slice(0, 5).map(d => `
                            <div class="date-item">
                                <span class="date-value">${escapeHtml(d.date)}</span>
                                <span class="time-value">${escapeHtml(d.times)}</span>
                            </div>
                        `).join('')}
                        ${parsed.dates.length > 5 ? `
                            <div class="date-more">+${parsed.dates.length - 5} more dates</div>
                        ` : ''}
                    </div>
                </div>
            ` : ''}

            <div class="message-content">
                <pre>${escapeHtml(msg.message)}</pre>
            </div>

            <div class="message-footer">
                <button class="btn-small btn-primary" onclick="copyMessage(${index})">
                    <span>📋</span> Copy
                </button>
                ${parsed.link ? `
                    <button class="btn-small btn-success">
                        <span>🔗</span> Book Now
                    </button>
                ` : ''}
                <div class="message-sender">
                    <span>👤</span> ${escapeHtml(msg.sender)}
                </div>
            </div>
        </div>
    `;
}

// Apply filter
function applyFilter() {
    if (filterKeywords.length === 0) {
        filteredMessages = [];
        filteredBadge.textContent = '0';
        return;
    }

    filteredMessages = allMessages.filter(msg => {
        const messageText = msg.message.toLowerCase();
        return filterKeywords.some(keyword =>
            messageText.includes(keyword.toLowerCase())
        );
    });

    filteredBadge.textContent = filteredMessages.length;

    if (currentView === 'filtered') {
        renderFilteredMessages();
    }
}

// Update statistics
function updateStats() {
    allMessagesBadge.textContent = allMessages.length;
    totalMessagesInfo.textContent = allMessages.length;

    const today = new Date().toDateString();
    const todayMessages = allMessages.filter(m =>
        new Date(m.timestamp).toDateString() === today
    );
    todayCount.textContent = todayMessages.length;

    if (allMessages.length > 0) {
        lastUpdate.textContent = formatTime(allMessages[0].timestamp);
    }
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleString();
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


// Sound volume (0.0 to 1.0)
let soundVolume = 0.8;

// Global audio context (created on first user interaction)
let audioContext = null;
let audioContextInitialized = false;

// Initialize audio context on first user interaction
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Resume if suspended
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    audioContextInitialized = true;
}

// Play loud bell sound
function playSound() {
    try {
        // Initialize audio context if needed
        if (!audioContext) {
            initAudioContext();
        }

        // Resume audio context if suspended
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                playBellSound();
            }).catch(err => {
                console.log('Audio context resume failed:', err);
                playFallbackSound();
            });
            return;
        }

        playBellSound();

    } catch (error) {
        console.error('Error playing sound:', error);
        playFallbackSound();
    }
}

// Play the actual bell sound
function playBellSound() {
    try {
        if (!audioContext) return;

        // Bell sound parameters
        const now = audioContext.currentTime;
        const duration = 2.5; // Bell rings for 2.5 seconds

        // Create master gain for volume control
        const masterGain = audioContext.createGain();
        masterGain.connect(audioContext.destination);
        masterGain.gain.setValueAtTime(soundVolume, now);

        // Create multiple oscillators for rich bell sound (harmonics)
        const frequencies = [
            { freq: 800, gain: 0.4 },   // Fundamental
            { freq: 1200, gain: 0.3 },  // 2nd harmonic
            { freq: 1600, gain: 0.2 },  // 3rd harmonic
            { freq: 2000, gain: 0.15 }, // 4th harmonic
            { freq: 2400, gain: 0.1 }   // 5th harmonic
        ];

        frequencies.forEach(({ freq, gain: gainValue }) => {
            // Create oscillator for each harmonic
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(masterGain);

            // Bell-like waveform
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, now);

            // Bell envelope: quick attack, slow decay
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(gainValue, now + 0.01); // Fast attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Slow decay

            oscillator.start(now);
            oscillator.stop(now + duration);
        });

        // Add a second "ding" for emphasis (0.3 seconds after first)
        setTimeout(() => {
            const now2 = audioContext.currentTime;
            const duration2 = 2.0;

            frequencies.forEach(({ freq, gain: gainValue }) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(masterGain);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq * 1.05, now2); // Slightly higher pitch

                gainNode.gain.setValueAtTime(0, now2);
                gainNode.gain.linearRampToValueAtTime(gainValue * 0.8, now2 + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now2 + duration2);

                oscillator.start(now2);
                oscillator.stop(now2 + duration2);
            });
        }, 300);

        // Visual feedback - flash the page briefly
        document.body.style.animation = 'alertFlash 0.5s ease-out';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 500);

    } catch (error) {
        console.error('Error in playBellSound:', error);
        playFallbackSound();
    }
}

// Fallback to simple audio element
function playFallbackSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.volume = soundVolume;
    audio.play().catch(() => { });
}

// Set sound volume (0.0 to 1.0)
function setSoundVolume(volume) {
    soundVolume = Math.max(0, Math.min(1, volume));
}


// Desktop notification
function showDesktopNotification(data) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const parsed = parseVisaSlot(data.message);
        new Notification(`New Visa Slot: ${parsed.country}`, {
            body: `${parsed.location} - ${parsed.slotType}\n${parsed.dates.length} dates available`,
            icon: '/botm/favicon.svg'
        });
    }
}

// Copy message
function copyMessage(index) {
    const msg = allMessages[index];
    navigator.clipboard.writeText(msg.message).then(() => {
        alert('Message copied to clipboard!');
    });
}

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const view = item.dataset.view;
        switchView(view);

        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
    });
});

function switchView(view) {
    currentView = view;

    allMessagesView.classList.remove('active');
    filteredView.classList.remove('active');
    settingsView.classList.remove('active');

    if (view === 'all-messages') {
        allMessagesView.classList.add('active');
        renderAllMessages();
    } else if (view === 'filtered') {
        filteredView.classList.add('active');
        renderFilteredMessages();
    } else if (view === 'settings') {
        settingsView.classList.add('active');
    }
}

// Filter controls
applyFilterBtn.addEventListener('click', () => {
    const keywords = filterInput.value.trim();
    if (keywords) {
        filterKeywords = keywords.split(',').map(k => k.trim()).filter(k => k);
        updateActiveFilters();
        applyFilter();
        renderFilteredMessages();
    }
});

clearFilterBtn.addEventListener('click', () => {
    filterInput.value = '';
    filterKeywords = [];
    updateActiveFilters();
    applyFilter();
    renderFilteredMessages();
});

filterInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        applyFilterBtn.click();
    }
});

function updateActiveFilters() {
    if (filterKeywords.length === 0) {
        activeFilters.innerHTML = '';
        return;
    }

    activeFilters.innerHTML = `
        <div class="filter-tags">
            ${filterKeywords.map(keyword => `
                <span class="filter-tag">
                    ${escapeHtml(keyword)}
                    <button onclick="removeFilter('${escapeHtml(keyword)}')" class="remove-filter">×</button>
                </span>
            `).join('')}
        </div>
    `;
}

function removeFilter(keyword) {
    filterKeywords = filterKeywords.filter(k => k !== keyword);
    updateActiveFilters();
    applyFilter();
    renderFilteredMessages();
}

// Sound toggle
soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔔' : '🔕';
    soundEnabledToggle.checked = soundEnabled;
});

soundEnabledToggle.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
    soundIcon.textContent = soundEnabled ? '🔔' : '🔕';
});

// Desktop notifications
desktopNotificationsToggle.addEventListener('change', (e) => {
    if (e.target.checked && 'Notification' in window) {
        Notification.requestPermission().then(permission => {
            desktopNotificationsEnabled = permission === 'granted';
            desktopNotificationsToggle.checked = desktopNotificationsEnabled;
        });
    } else {
        desktopNotificationsEnabled = false;
    }
});

// Volume slider
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');

if (volumeSlider && volumeValue) {
    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        volumeValue.textContent = volume + '%';
        setSoundVolume(volume / 100);
    });

    // Test sound on slider release
    volumeSlider.addEventListener('change', () => {
        if (soundEnabled) {
            playSound();
        }
    });
}

// Other settings
autoRefreshToggle.addEventListener('change', (e) => {
    autoRefreshEnabled = e.target.checked;
});

compactModeToggle.addEventListener('change', (e) => {
    compactMode = e.target.checked;
    document.body.classList.toggle('compact-mode', compactMode);
});

// Clear all
clearAllBtn.addEventListener('click', async () => {
    if (confirm('Clear all messages? This cannot be undone.')) {
        try {
            const response = await fetch('/api/notifications', { method: 'DELETE' });
            const data = await response.json();

            allMessages = [];
            filteredMessages = [];
            currentOffset = 100;
            updateStats();
            renderAllMessages();
            renderFilteredMessages();

            console.log(`✅ Cleared ${data.deletedCount} messages from database`);
        } catch (error) {
            alert('Failed to clear messages: ' + error.message);
        }
    }
});

clearDataBtn.addEventListener('click', async () => {
    if (confirm('Clear all messages? This cannot be undone.')) {
        try {
            const response = await fetch('/api/notifications', { method: 'DELETE' });
            const data = await response.json();

            allMessages = [];
            filteredMessages = [];
            currentOffset = 100;
            updateStats();
            renderAllMessages();
            renderFilteredMessages();

            console.log(`✅ Cleared ${data.deletedCount} messages from database`);
        } catch (error) {
            alert('Failed to clear messages: ' + error.message);
        }
    }
});

// Export data
exportBtn.addEventListener('click', exportData);
exportDataBtn.addEventListener('click', exportData);

function exportData() {
    const data = JSON.stringify(allMessages, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visard-slots-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// Refresh
refreshBtn.addEventListener('click', () => {
    loadHistoricalMessages();
});

// Load More button
const loadMoreBtn = document.getElementById('loadMoreBtn');
if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreMessages);
}

// Initialize - Load historical messages from database
loadHistoricalMessages();
updateStats();

// Initialize audio context on first user interaction (required by browsers)
document.addEventListener('click', initAudioContext, { once: true });
document.addEventListener('keypress', initAudioContext, { once: true });
document.addEventListener('touchstart', initAudioContext, { once: true });
