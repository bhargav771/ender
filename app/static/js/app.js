/**
 * ScrapePro — Frontend JavaScript
 */

let currentJobId = null;
let pollInterval = null;
let allResults = [];
let dbData = [];

// ═══════════════════════════════════════════════════════════════
// API KEY HELPER
// ═══════════════════════════════════════════════════════════════

function getApiHeaders(contentType) {
    const headers = {};
    if (contentType) headers['Content-Type'] = contentType;
    const apiKey = localStorage.getItem('scrapepro_api_key');
    if (apiKey) headers['X-API-Key'] = apiKey;
    return headers;
}

function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    const key = (input.value || '').trim();
    if (!key) { showToast('Enter an API key first', 'error'); return; }
    localStorage.setItem('scrapepro_api_key', key);
    showToast('API key saved to browser', 'success');
}

function clearApiKey() {
    localStorage.removeItem('scrapepro_api_key');
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = '';
    showToast('API key cleared', 'success');
}

function loadSavedApiKey() {
    const saved = localStorage.getItem('scrapepro_api_key');
    const input = document.getElementById('apiKeyInput');
    if (saved && input) input.value = saved;
}

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════

function switchTab(tab) {
    // Hide all tabs
    document.getElementById('tabDashboard').style.display = 'none';
    document.getElementById('tabScraper').style.display = 'none';
    document.getElementById('tabHistory').style.display = 'none';
    document.getElementById('tabDatabase').style.display = 'none';
    document.getElementById('tabLogs').style.display = 'none';
    document.getElementById('tabSettings').style.display = 'none';

    // Remove active from nav items
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    // Show selected tab and set active nav
    const titles = {
        dashboard: ['Dashboard Overview', 'Real-time scraping metrics & health'],
        scraper: ['Scraper Control Panel', 'Configure and launch data extraction jobs'],
        history: ['Enrichment Module', 'Task history and data enrichment'],
        database: ['Data Table View', 'Explore and manage collected records'],
        logs: ['Logs & Monitoring', 'System health, latency, and error tracking'],
        settings: ['Settings', 'API keys, connections, and preferences']
    };

    const [title, subtitle] = titles[tab] || titles.dashboard;
    document.getElementById('pageTitle').textContent = title;
    document.getElementById('pageSubtitle').textContent = subtitle;

    const navItem = document.querySelector(`.nav-item[data-tab="${tab}"]`);
    if (navItem) navItem.classList.add('active');

    switch (tab) {
        case 'dashboard':
            document.getElementById('tabDashboard').style.display = 'block';
            loadDbStats();
            loadRecentTasks();
            break;
        case 'scraper':
            document.getElementById('tabScraper').style.display = 'block';
            break;
        case 'history':
            document.getElementById('tabHistory').style.display = 'block';
            loadTaskHistory();
            break;
        case 'database':
            document.getElementById('tabDatabase').style.display = 'block';
            loadIndustries();
            loadDatabaseData();
            break;
        case 'logs':
            document.getElementById('tabLogs').style.display = 'block';
            break;
        case 'settings':
            document.getElementById('tabSettings').style.display = 'block';
            checkSupabaseStatus();
            break;
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.querySelector('.sidebar-overlay');
    if (overlay) overlay.classList.remove('active');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        };
        document.body.appendChild(overlay);
    }
    overlay.classList.toggle('active');
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════

function switchSettingsTab(el, section) {
    document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('settingsApikeys').style.display = section === 'apikeys' ? 'block' : 'none';
    document.getElementById('settingsGeneral').style.display = section === 'general' ? 'block' : 'none';
}

async function checkSupabaseStatus() {
    const statusEl = document.getElementById('supabaseStatus');
    const indicator = document.getElementById('supabaseIndicator');
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            statusEl.textContent = 'Connected and operational';
            statusEl.style.color = '#10b981';
            if (indicator) indicator.querySelector('.status-dot').classList.add('connected');
        } else {
            statusEl.textContent = 'Connection error';
            statusEl.style.color = '#ef4444';
        }
    } catch (e) {
        statusEl.textContent = 'Disconnected';
        statusEl.style.color = '#ef4444';
    }
}

// ═══════════════════════════════════════════════════════════════
// LOGS TAB
// ═══════════════════════════════════════════════════════════════

function filterLogs(btn, level) {
    document.querySelectorAll('.log-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
        if (level === 'all') {
            entry.style.display = 'flex';
        } else {
            entry.style.display = entry.classList.contains(level) ? 'flex' : 'none';
        }
    });
}

function addLogEntry(level, message) {
    const stream = document.getElementById('logStream');
    if (!stream) return;
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    const entry = document.createElement('div');
    entry.className = `log-entry ${level}`;
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-badge ${level}">${level.toUpperCase()}</span><span class="log-msg">${escapeHtml(message)}</span>`;
    stream.appendChild(entry);
    stream.scrollTop = stream.scrollHeight;
}

// ═══════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${escapeHtml(message)}`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD — STATS & RECENT ACTIVITY
// ═══════════════════════════════════════════════════════════════

async function loadDbStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();

        const totalBiz = data.total_businesses || 0;
        const totalEmails = data.total_emails || 0;
        const totalTasks = data.total_tasks || 0;

        animateNumber('dbTotalBiz', totalBiz);
        animateNumber('dbTotalEmails', totalEmails);
        animateNumber('dbTotalTasks', totalTasks);

        // Email rate
        const emailRate = totalBiz > 0 ? Math.round((totalEmails / totalBiz) * 100) : 0;
        document.getElementById('emailRate').textContent = emailRate + '%';
        document.getElementById('emailRateBar').style.width = emailRate + '%';

        // Load POS count from data endpoint
        try {
            const dataResp = await fetch('/api/data?limit=5000');
            const dataResult = await dataResp.json();
            const allData = dataResult.data || [];
            const posCount = allData.filter(r => r.has_pos === 'Yes').length;
            animateNumber('dbTotalPos', posCount);

            const posRate = totalBiz > 0 ? Math.round((posCount / totalBiz) * 100) : 0;
            document.getElementById('posRate').textContent = posRate + '%';
            document.getElementById('posRateBar').style.width = posRate + '%';
        } catch (e) {
            console.error('POS stat error:', e);
        }

        // Industries
        try {
            const indResp = await fetch('/api/industries');
            const indData = await indResp.json();
            const indCount = (indData.industries || []).length;
            document.getElementById('industryCount').textContent = indCount;
            document.getElementById('industryBar').style.width = Math.min(indCount * 10, 100) + '%';
        } catch (e) {
            console.error('Industry stat error:', e);
        }

    } catch (error) {
        console.error('Failed to load DB stats:', error);
    }
}

function animateNumber(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const current = parseInt(el.textContent) || 0;
    if (current === target) return;

    const duration = 600;
    const start = performance.now();

    function update(timestamp) {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(current + (target - current) * eased);
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

async function loadRecentTasks() {
    const container = document.getElementById('recentTasks');
    const emptyEl = document.getElementById('dashboardEmpty');
    const tableEl = document.getElementById('recentRunsTable');
    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        const tasks = (data.tasks || []).slice(0, 8);

        if (tasks.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            if (tableEl) tableEl.style.display = 'none';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';
        if (tableEl) tableEl.style.display = 'block';

        container.innerHTML = tasks.map(t => {
            const statusClass = t.status === 'Completed' ? 'cell-open' :
                               t.status === 'Running' ? 'accent-blue' : 'cell-closed';
            const created = t.created_at ? new Date(t.created_at).toLocaleDateString() : '-';
            const statusBadge = t.status === 'Completed' ?
                '<span style="color:var(--success);font-weight:600;">Completed</span>' :
                t.status === 'Running' ?
                '<span style="color:var(--blue);font-weight:600;">Running</span>' :
                '<span style="color:var(--danger);font-weight:600;">Failed</span>';

            return `<tr>
                <td><span style="font-weight:600;color:var(--text-primary);">${escapeHtml(t.search_term)}</span></td>
                <td>${escapeHtml(t.zip_codes) || '-'}</td>
                <td>${statusBadge}</td>
                <td>${t.total_results || 0}</td>
                <td>${created}</td>
                <td><button class="btn btn-outline btn-xs" onclick="viewTaskResults('${t.job_id}')"><i class="fas fa-eye"></i></button></td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Failed to load recent tasks:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// SCRAPER
// ═══════════════════════════════════════════════════════════════

async function startScraping() {
    const searchTerms = document.getElementById('searchTerms').value
        .split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const zipCodes = document.getElementById('zipCodes').value
        .split('\n').map(s => s.trim()).filter(s => s.length > 0);

    if (searchTerms.length === 0) { showToast('Enter at least one search term', 'error'); return; }
    if (zipCodes.length === 0) { showToast('Enter at least one zip code', 'error'); return; }

    const maxResults = parseInt(document.getElementById('maxResults').value) || 20;
    const startBtn = document.getElementById('startBtn');

    startBtn.disabled = true;
    startBtn.innerHTML = '<span class="spinner"></span> Scraping...';

    // Update monitor badge
    const badge = document.querySelector('.monitor-badge');
    if (badge) { badge.className = 'monitor-badge running'; badge.textContent = 'Running'; }

    addLogEntry('info', `Starting scrape: ${searchTerms.join(', ')} in ${zipCodes.length} locations`);

    try {
        const response = await fetch('/api/scrape', {
            method: 'POST',
            headers: getApiHeaders('application/json'),
            body: JSON.stringify({ search_terms: searchTerms, zip_codes: zipCodes, max_results_per_search: maxResults }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to start scraping');

        currentJobId = data.job_id;
        showToast('Scraping started!', 'success');
        addLogEntry('info', `Job ${data.job_id} created successfully`);

        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('liveIndicator').style.display = 'flex';

        startPolling();
    } catch (error) {
        showToast(error.message, 'error');
        addLogEntry('error', `Scrape failed: ${error.message}`);
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="fas fa-play"></i> Run Scraper';
        if (badge) { badge.className = 'monitor-badge idle'; badge.textContent = 'Idle'; }
    }
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        if (!currentJobId) return;

        try {
            const response = await fetch(`/api/job/${currentJobId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);

            const percent = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            document.getElementById('progressBar').style.width = `${percent}%`;
            document.getElementById('progressText').textContent = `${data.completed} / ${data.total} searches`;
            document.getElementById('progressPercent').textContent = `${percent}%`;

            allResults = data.results || [];
            updateLiveStats();
            renderResults(allResults);

            // Update success stat
            const successEl = document.getElementById('statSuccess');
            if (successEl && data.total > 0) {
                successEl.textContent = percent + '%';
            }

            if (data.status === 'completed' || data.status === 'failed') {
                clearInterval(pollInterval);
                pollInterval = null;

                const startBtn = document.getElementById('startBtn');
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-play"></i> Run Scraper';
                document.getElementById('progressContainer').style.display = 'none';
                document.getElementById('liveIndicator').style.display = 'none';

                const badge = document.querySelector('.monitor-badge');

                if (data.status === 'completed') {
                    showToast(`Done! Found ${data.results_count} leads.`, 'success');
                    addLogEntry('info', `Job completed: ${data.results_count} leads found`);
                    if (badge) { badge.className = 'monitor-badge idle'; badge.textContent = 'Done'; }
                } else {
                    showToast('Scraping failed. Check logs.', 'error');
                    addLogEntry('error', 'Job failed');
                    if (badge) { badge.className = 'monitor-badge idle'; badge.textContent = 'Failed'; }
                }

                loadDbStats();
            }
        } catch (error) {
            console.error('Poll error:', error);
        }
    }, 2000);
}

function updateLiveStats() {
    document.getElementById('statTotal').textContent = allResults.length;
    document.getElementById('statEmails').textContent = allResults.filter(r => r.final_email).length;
    document.getElementById('statPos').textContent = allResults.filter(r => r.has_pos === 'Yes').length;
}

function renderResults(results) {
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');

    if (results.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tableContainer.style.display = 'block';

    const filter = document.getElementById('filterInput').value.toLowerCase();
    let filtered = results;
    if (filter) {
        filtered = results.filter(r =>
            (r.name || '').toLowerCase().includes(filter) ||
            (r.address || '').toLowerCase().includes(filter) ||
            (r.final_email || '').toLowerCase().includes(filter) ||
            (r.phone || '').toLowerCase().includes(filter) ||
            (r.city || '').toLowerCase().includes(filter)
        );
    }

    document.getElementById('resultsBody').innerHTML = filtered.map((r, i) => {
        const socialHtml = buildSocialIcons(r);
        const websiteUrl = r.website ? (r.website.startsWith('http') ? r.website : 'https://' + r.website) : '';

        return `<tr>
            <td>${i + 1}</td>
            <td title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</td>
            <td title="${escapeHtml(r.address)}">${escapeHtml(r.address)}</td>
            <td>${escapeHtml(r.phone)}</td>
            <td class="cell-email" title="${escapeHtml(r.final_email)}">${escapeHtml(r.final_email) || '-'}</td>
            <td>${websiteUrl ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" class="cell-link">Visit</a>` : '-'}</td>
            <td>${socialHtml || '-'}</td>
            <td>${escapeHtml(r.rating) || '-'}</td>
            <td class="${r.has_pos === 'Yes' ? 'cell-pos-yes' : 'cell-pos-no'}">${r.has_pos || '-'}</td>
            <td class="${(r.status || '') === 'Open' ? 'cell-open' : 'cell-closed'}">${escapeHtml(r.status) || '-'}</td>
        </tr>`;
    }).join('');
}

function buildSocialIcons(r) {
    let html = '<div class="social-icons">';
    let hasAny = false;
    if (r.facebook_link) { html += `<a href="${escapeHtml(r.facebook_link)}" target="_blank" class="fb" title="Facebook"><i class="fab fa-facebook-f"></i></a>`; hasAny = true; }
    if (r.instagram_link) { html += `<a href="${escapeHtml(r.instagram_link)}" target="_blank" class="ig" title="Instagram"><i class="fab fa-instagram"></i></a>`; hasAny = true; }
    if (r.twitter_link) { html += `<a href="${escapeHtml(r.twitter_link)}" target="_blank" class="tw" title="Twitter"><i class="fab fa-twitter"></i></a>`; hasAny = true; }
    if (r.linkedin_link) { html += `<a href="${escapeHtml(r.linkedin_link)}" target="_blank" class="li" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`; hasAny = true; }
    html += '</div>';
    return hasAny ? html : '';
}

// ═══════════════════════════════════════════════════════════════
// TASK HISTORY
// ═══════════════════════════════════════════════════════════════

async function loadTaskHistory() {
    const tasksBody = document.getElementById('tasksBody');
    const tasksEmpty = document.getElementById('tasksEmpty');
    const wrapper = document.getElementById('tasksTableWrapper');

    try {
        const response = await fetch('/api/tasks');
        const data = await response.json();
        const tasks = data.tasks || [];

        if (tasks.length === 0) {
            tasksEmpty.style.display = 'block';
            wrapper.style.display = 'none';
            return;
        }

        tasksEmpty.style.display = 'none';
        wrapper.style.display = 'block';

        tasksBody.innerHTML = tasks.map(t => {
            const created = t.created_at ? new Date(t.created_at).toLocaleString() : '-';
            const statusClass = t.status === 'Completed' ? 'cell-open' :
                               t.status === 'Failed' ? 'cell-closed' : '';
            return `<tr>
                <td><code style="color:var(--primary-light);font-size:0.75rem;">${escapeHtml(t.job_id)}</code></td>
                <td title="${escapeHtml(t.search_term)}">${escapeHtml(t.search_term)}</td>
                <td title="${escapeHtml(t.zip_codes)}">${escapeHtml(t.zip_codes)}</td>
                <td class="${statusClass}">${escapeHtml(t.status)}</td>
                <td>${t.total_results || 0}</td>
                <td style="font-size:0.75rem;">${created}</td>
                <td>
                    <div class="task-actions">
                        <button class="btn btn-outline btn-xs" onclick="viewTaskResults('${t.job_id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-danger btn-xs" onclick="deleteTask('${t.job_id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (error) {
        console.error('Failed to load tasks:', error);
        showToast('Failed to load task history', 'error');
    }
}

async function viewTaskResults(jobId) {
    try {
        const response = await fetch(`/api/tasks/${jobId}/results`);
        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
            showToast('No results for this task.', 'info');
            return;
        }

        switchTab('database');
        dbData = results;
        renderDbTable(results);
        document.getElementById('dbResultCount').textContent = `${results.length} records (Task: ${jobId})`;
    } catch (error) {
        showToast('Failed to load results', 'error');
    }
}

async function deleteTask(jobId) {
    if (!confirm(`Delete task ${jobId} and ALL its data?`)) return;

    try {
        const response = await fetch(`/api/tasks/${jobId}`, { method: 'DELETE', headers: getApiHeaders() });
        const data = await response.json();
        if (response.ok) {
            showToast('Task deleted.', 'success');
            addLogEntry('warn', `Task ${jobId} deleted`);
            loadTaskHistory();
            loadDbStats();
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteAllData() {
    if (!confirm('DELETE ALL DATA? This removes ALL tasks and business data permanently.')) return;
    if (!confirm('Are you SURE? This CANNOT be undone.')) return;

    try {
        const response = await fetch('/api/data', { method: 'DELETE', headers: getApiHeaders() });
        if (response.ok) {
            showToast('All data deleted.', 'success');
            addLogEntry('warn', 'All data deleted by user');
            loadTaskHistory();
            loadDbStats();
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// DATABASE EXPLORER
// ═══════════════════════════════════════════════════════════════

async function loadIndustries() {
    try {
        const response = await fetch('/api/industries');
        const data = await response.json();
        const industries = data.industries || [];

        const select = document.getElementById('industryFilter');
        while (select.options.length > 1) select.remove(1);

        industries.forEach(ind => {
            const option = document.createElement('option');
            option.value = ind;
            option.textContent = ind;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load industries:', error);
    }
}

async function loadDatabaseData() {
    const industry = document.getElementById('industryFilter').value;
    const dbEmpty = document.getElementById('dbEmpty');
    const dbTableContainer = document.getElementById('dbTableContainer');

    try {
        const response = await fetch(`/api/data?industry=${encodeURIComponent(industry)}`);
        const data = await response.json();
        dbData = data.data || [];

        document.getElementById('dbResultCount').textContent = `${dbData.length} records`;

        if (dbData.length === 0) {
            dbEmpty.style.display = 'block';
            dbTableContainer.style.display = 'none';
            return;
        }

        dbEmpty.style.display = 'none';
        dbTableContainer.style.display = 'block';
        renderDbTable(dbData);
    } catch (error) {
        console.error('Failed to load data:', error);
        showToast('Failed to load database data', 'error');
    }
}

function renderDbTable(data) {
    const dbBody = document.getElementById('dbBody');
    const dbEmpty = document.getElementById('dbEmpty');
    const dbTableContainer = document.getElementById('dbTableContainer');

    if (data.length === 0) {
        dbEmpty.style.display = 'block';
        dbTableContainer.style.display = 'none';
        return;
    }

    dbEmpty.style.display = 'none';
    dbTableContainer.style.display = 'block';

    dbBody.innerHTML = data.map((r, i) => {
        const websiteUrl = r.website ? (r.website.startsWith('http') ? r.website : 'https://' + r.website) : '';
        let domain = '-';
        try { if (websiteUrl) domain = new URL(websiteUrl).hostname.replace('www.', ''); } catch (e) { domain = websiteUrl.replace(/^https?:\/\//, '').split('/')[0] || '-'; }
        const statusBadge = (r.status || '') === 'Open' ?
            '<span class="cell-open">Active</span>' :
            '<span class="cell-closed">Closed</span>';
        return `<tr>
            <td><span style="font-weight:600;color:var(--text-primary);">${escapeHtml(r.name)}</span></td>
            <td>${websiteUrl ? `<a href="${escapeHtml(websiteUrl)}" target="_blank" class="cell-link">${escapeHtml(domain)}</a>` : '-'}</td>
            <td>${escapeHtml(r.search_query) || '-'}</td>
            <td class="cell-email">${escapeHtml(r.final_email) || '-'}</td>
            <td>${escapeHtml(r.phone) || '-'}</td>
            <td>${escapeHtml(r.rating) || '-'}</td>
            <td>${escapeHtml(r.pos_system) || (r.has_pos === 'Yes' ? 'Yes' : '-')}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');
}

function filterDbTable() {
    const filter = document.getElementById('dbFilterInput').value.toLowerCase();
    if (!filter) {
        renderDbTable(dbData);
        document.getElementById('dbResultCount').textContent = `${dbData.length} records`;
        return;
    }

    const filtered = dbData.filter(r =>
        (r.name || '').toLowerCase().includes(filter) ||
        (r.address || '').toLowerCase().includes(filter) ||
        (r.final_email || '').toLowerCase().includes(filter) ||
        (r.phone || '').toLowerCase().includes(filter) ||
        (r.website || '').toLowerCase().includes(filter)
    );

    renderDbTable(filtered);
    document.getElementById('dbResultCount').textContent = `${filtered.length} of ${dbData.length} records`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

async function exportResults(format) {
    if (!currentJobId || allResults.length === 0) {
        showToast('No results to export.', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/export/${currentJobId}/${format}`);
        if (!response.ok) throw new Error('Export failed');
        downloadBlob(response, `leads_${currentJobId}.${format}`);
        showToast(`Exported ${allResults.length} leads as ${format.toUpperCase()}`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function exportDbCsv() {
    const industry = document.getElementById('industryFilter').value;
    await downloadDbExport('csv', industry);
}

async function exportDbJson() {
    const industry = document.getElementById('industryFilter').value;
    await downloadDbExport('json', industry);
}

async function downloadDbExport(format, industry) {
    try {
        const url = `/api/export-db/${format}?industry=${encodeURIComponent(industry)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Export failed');
        downloadBlob(response, `leads_${industry || 'all'}.${format}`);
        showToast(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function downloadBlob(response, filename) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════

async function checkDbConnection() {
    try {
        const response = await fetch('/api/stats');
        if (response.ok) {
            const dot = document.getElementById('dbDot');
            if (dot) dot.classList.add('connected');
        }
    } catch (e) {
        const dot = document.getElementById('dbDot');
        if (dot) dot.classList.remove('connected');
    }
}

// Boot
switchTab('dashboard');
checkDbConnection();
loadSavedApiKey();
