const socket = io();
let alerts = [];
let soundEnabled = true;
let keywords = [];

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const totalAlertsEl = document.getElementById('totalAlerts');
const todayAlertsEl = document.getElementById('todayAlerts');
const lastAlertEl = document.getElementById('lastAlert');
const alertsList = document.getElementById('alertsList');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const soundToggle = document.getElementById('soundToggle');
const keywordInput = document.getElementById('keywordInput');
const addKeywordBtn = document.getElementById('addKeywordBtn');
const keywordsList = document.getElementById('keywordsList');

// Connection status
socket.on('connect', () => {
    connectionStatus.classList.add('connected');
    connectionStatus.querySelector('.status-text').textContent = 'Connected';
});

socket.on('disconnect', () => {
    connectionStatus.classList.remove('connected');
    connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
});

// Receive alerts
socket.on('telegram-alert', (data) => {
    addAlert(data);
    if (soundEnabled) playSound();
});

function addAlert(data) {
    alerts.unshift(data);
    renderAlerts();
    updateStats();
}

function renderAlerts() {
    if (alerts.length === 0) {
        alertsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👀</div>
                <p>Monitoring messages from: <strong>visard</strong></p>
                <p class="empty-subtitle">All messages will appear here in real-time</p>
            </div>
        `;
        return;
    }

    alertsList.innerHTML = alerts.map(alert => {
        const isKeywordMatch = alert.isKeywordMatch;
        const keywordBadge = isKeywordMatch
            ? `<span class="alert-keyword">${alert.keyword}</span>`
            : `<span class="alert-keyword all-messages">ALL MESSAGES</span>`;

        return `
        <div class="alert-card new ${isKeywordMatch ? 'keyword-match' : ''}">
            <div class="alert-header">
                ${keywordBadge}
                <span class="alert-time">${formatTime(alert.timestamp)}</span>
            </div>
            <div class="alert-message">${escapeHtml(alert.message)}</div>
            <div class="alert-footer">
                <div class="alert-group">
                    <span>📱</span>
                    <span>${escapeHtml(alert.group)}</span>
                </div>
            </div>
        </div>
    `}).join('');

    setTimeout(() => {
        document.querySelectorAll('.alert-card.new').forEach(card => {
            card.classList.remove('new');
        });
    }, 600);
}

function updateStats() {
    totalAlertsEl.textContent = alerts.length;

    const today = new Date().toDateString();
    const todayCount = alerts.filter(a =>
        new Date(a.timestamp).toDateString() === today
    ).length;
    todayAlertsEl.textContent = todayCount;

    if (alerts.length > 0) {
        lastAlertEl.textContent = formatTime(alerts[0].timestamp);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.play().catch(() => { });
}

// Event Listeners
clearBtn.addEventListener('click', () => {
    if (confirm('Clear all alerts?')) {
        alerts = [];
        renderAlerts();
        updateStats();
    }
});

exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(alerts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${Date.now()}.json`;
    a.click();
});

soundToggle.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
});

// Keyword Management
function renderKeywords() {
    if (keywords.length === 0) {
        keywordsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No keywords added yet. Add keywords to start monitoring.</p>';
        return;
    }

    keywordsList.innerHTML = keywords.map(keyword => `
        <div class="keyword-tag">
            <span class="keyword-text">${escapeHtml(keyword)}</span>
            <button class="remove-btn" onclick="removeKeyword('${escapeHtml(keyword)}')" title="Remove keyword">×</button>
        </div>
    `).join('');
}

function addKeyword() {
    const keyword = keywordInput.value.trim();
    if (keyword) {
        socket.emit('add-keyword', keyword);
        keywordInput.value = '';
    }
}

function removeKeyword(keyword) {
    socket.emit('remove-keyword', keyword);
}

// Socket event for keyword updates
socket.on('keywords-update', (updatedKeywords) => {
    keywords = updatedKeywords;
    renderKeywords();
});

// Keyword input events
addKeywordBtn.addEventListener('click', addKeyword);

keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addKeyword();
    }
});

// Initialize
renderAlerts();
updateStats();
renderKeywords();
