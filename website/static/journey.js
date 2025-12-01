// Journey Page - Real User Agent Interaction with Calibration

let currentScene = null;
let calibrationData = [];

// Get partner info from URL or localStorage
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const partnerId = urlParams.get('partner_id');
    const partnerData = JSON.parse(localStorage.getItem('journey_partner') || '{}');
    
    if (partnerData.name) {
        document.getElementById('partner-display').textContent = partnerData.name;
        initJourney(partnerData);
    } else {
        alert('No partner selected. Redirecting to Discovery...');
        window.location.href = '/discovery';
    }
});

function initJourney(partnerData) {
    // Initialize game stage (reuse Sandbox logic)
    initGameStage(partnerData);
    
    // Start the journey simulation
    startJourney(partnerData);
}

function initGameStage(partnerData) {
    const gameContent = document.getElementById('game-content');
    if (gameContent) {
        gameContent.innerHTML = '';
    }
    
    // Set avatars
    const charRight = document.getElementById('char-name-right');
    const charLeft = document.getElementById('char-name-left');
    const avatarRight = document.getElementById('char-avatar-right');
    const avatarLeft = document.getElementById('char-avatar-left');
    
    // Get current user info
    fetch('/get_user_info').then(r => r.json()).then(data => {
        if (charRight) charRight.textContent = data.information?.nickname || 'You';
        if (avatarRight) avatarRight.innerHTML = getGenderAvatarSVG(data.information?.gender || 'unknown');
    });
    
    if (charLeft) charLeft.textContent = partnerData.name || 'Partner';
    if (avatarLeft) avatarLeft.innerHTML = getGenderAvatarSVG(partnerData.gender || 'unknown');
}

function startJourney(partnerData) {
    // This would trigger a real simulation via Socket.IO
    // For MVP, we'll show a mock interaction with calibration prompts
    
    setTimeout(() => {
        showScene({
            scenario: "You meet at a coffee shop. The conversation starts...",
            yourAction: "You decide to compliment their style.",
            rationale: "I always appreciate good fashion sense."
        });
    }, 1000);
}

function showScene(scene) {
    currentScene = scene;
    
    // Add to game content
    const gameContent = document.getElementById('game-content');
    
    // Add scenario
    addGameScenario(scene.scenario);
    
    // Add your action
    setTimeout(() => {
        addGameMessage('You', 'unknown', { content: scene.yourAction }, scene.rationale, true);
        
        // Show calibration panel
        setTimeout(() => {
            showCalibration(scene);
        }, 500);
    }, 1000);
}

function showCalibration(scene) {
    const panel = document.getElementById('calibration-panel');
    const text = document.getElementById('calibration-scene-text');
    
    text.textContent = `"${scene.yourAction}" - ${scene.rationale}`;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function calibrate(choice) {
    if (!currentScene) return;
    
    calibrationData.push({
        scene: currentScene,
        choice: choice,
        timestamp: Date.now()
    });
    
    // Hide panel
    document.getElementById('calibration-panel').style.display = 'none';
    
    // Continue journey
    setTimeout(() => {
        // Next scene would come from server
        showScene({
            scenario: "The conversation deepens...",
            yourAction: "You share a personal story.",
            rationale: "I feel comfortable opening up."
        });
    }, 1000);
}

// Helper functions (reuse from Sandbox)
function getGenderAvatarSVG(gender) {
    const svgMale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gM' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#a1c4fd'/><stop offset='100%' stop-color='#c2e9fb'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gM)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    const svgFemale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gF' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#fdcbf1'/><stop offset='100%' stop-color='#e6dee9'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gF)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    return gender === 'male' ? svgMale : svgFemale;
}

function addGameScenario(scenario) {
    const div = document.createElement('div');
    div.className = 'system-event';
    div.innerHTML = `
        <span class="system-badge">SCENARIO</span>
        <div class="system-text">${scenario}</div>
    `;
    addToGameChat(div);
}

function addGameMessage(avatarName, gender, decision, rationale, isUserAgent) {
    const div = document.createElement('div');
    div.className = `chat-message ${isUserAgent ? 'message-right' : 'message-left'}`;
    
    const actionContent = decision.content || '';
    
    div.innerHTML = `
        <div class="bubble-content">
            ${actionContent}
        </div>
        ${rationale ? `<div class="thought-bubble">💭 ${rationale}</div>` : ''}
    `;
    addToGameChat(div);
}

function addToGameChat(element) {
    const gameContent = document.getElementById('game-content');
    if (gameContent) {
        gameContent.appendChild(element);
        gameContent.scrollTop = gameContent.scrollHeight;
    }
}
