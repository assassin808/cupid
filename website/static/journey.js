// History Logic

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

let historyData = {
    shorts: [],
    longs: []
};

function loadHistory() {
    fetch('/api/user/history')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                historyData.shorts = data.short_dates || [];
                historyData.longs = data.long_dates || [];
                renderList('short'); // Default
            } else {
                document.getElementById('history-content').innerHTML = 
                    `<div class="no-data">Please log in to view history.</div>`;
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('history-content').innerHTML = 
                `<div class="no-data">Failed to load history.</div>`;
        });
}

function switchTab(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderList(type);
}

function renderList(type) {
    const container = document.getElementById('history-content');
    container.innerHTML = '';
    
    const items = type === 'short' ? historyData.shorts : historyData.longs;
    
    if (items.length === 0) {
        container.innerHTML = `<div class="no-data" style="grid-column: 1/-1; text-align:center;">No ${type === 'short' ? 'sparks' : 'deep dates'} recorded yet.</div>`;
        return;
    }
    
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        // Determine Avatar/Name (Mock logic since we don't have full user objects yet)
        // In real app, we'd fetch or store user info in the history item
        const name = type === 'short' ? (item.target_id || 'Mystery Agent') : (item.partner_persona?.nickname || 'Partner');
        const date = new Date(item.timestamp || item.created_at).toLocaleDateString();
        
        let contentHtml = '';
        
        if (type === 'short') {
            // Short Date Content
            const dialogue = item.dialogue && item.dialogue.length > 0 ? item.dialogue[0].text : "No dialogue recorded.";
            contentHtml = `
                <div class="card-body">
                    <div class="dialogue-snippet">"${dialogue}"</div>
                </div>
                <div class="card-actions">
                    <button class="btn-action" onclick="window.location.href='/sandbox'">Revisit Hall</button>
                </div>
            `;
        } else {
            // Long Date Content
            const score = item.cumulative_rate || 0;
            contentHtml = `
                <div class="card-body">
                    Compatibility: <span class="card-score">${score}/50</span>
                </div>
                <div class="card-actions">
                    <button class="btn-action" onclick="viewSimulation('${item._id}')">View Report</button>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-avatar"></div> <!-- Placeholder for now -->
                <div class="card-meta">
                    <div class="card-name">${name}</div>
                    <div class="card-date">${date}</div>
                </div>
            </div>
            ${contentHtml}
        `;
        
        container.appendChild(card);
    });
}

function viewSimulation(id) {
    // In future, link to report page
    alert("Detailed report view coming soon!");
}
