// Cupid AI Sandbox JavaScript

// Global state
let avatars = {
    avatar1: null,
    avatar2: null
};

let simulationRunning = false;
let socket = null;
// current simulation + feedback state
let currentSimulation = {
    simulation: [],
    cumulative_rate: null,
    keyMoments: []
};

// Sample avatars for quick testing
const sampleAvatars = {
    emma: {
        nickname: "Emma",
        age: 28,
        gender: "female",
        occupation: "Software Engineer",
        interests: "Hiking, reading sci-fi novels, playing guitar, cooking Italian food",
        bio: "I'm an introverted tech enthusiast who loves outdoor adventures on weekends. I value deep conversations and authenticity. Looking for someone who can appreciate both quiet evenings at home and spontaneous road trips."
    },
    alex: {
        nickname: "Alex",
        age: 30,
        gender: "male",
        occupation: "Graphic Designer",
        interests: "Photography, coffee culture, indie music, traveling to new cities",
        bio: "Creative soul with a passion for visual storytelling. I'm an ambivert who enjoys both social gatherings and solo creative time. Seeking someone who appreciates art, good coffee, and meaningful conversations."
    },
    sophia: {
        nickname: "Sophia",
        age: 26,
        gender: "female",
        occupation: "Marketing Manager",
        interests: "Yoga, sustainability, vegan cooking, running marathons",
        bio: "Health-conscious and environmentally aware. I'm energetic, optimistic, and love trying new things. Looking for a partner who shares my values about wellness and making a positive impact on the world."
    },
    james: {
        nickname: "James",
        age: 32,
        gender: "male",
        occupation: "Data Scientist",
        interests: "Chess, jazz music, craft beer brewing, philosophy podcasts",
        bio: "Analytical thinker with a philosophical bent. I enjoy intellectual debates and discovering patterns in everyday life. Seeking someone curious about the world and comfortable with comfortable silences."
    }
};

// Initialize sandbox
document.addEventListener('DOMContentLoaded', function() {
    try { checkAutoFill(); } catch (e) { console.error("AutoFill Error", e); }
    try { checkBothAvatarsReady(); } catch (e) { console.error("CheckAvatars Error", e); }
    try { addSampleButtons(); } catch (e) { console.error("AddSampleButtons Error", e); }
    try { initializeSocket(); } catch (e) { console.error("Socket Error", e); }
    try { bindProfileFillButton(); } catch (e) { console.error("ProfileFill Error", e); }
    try { checkPrefill(); } catch (e) { console.error("Prefill Error", e); }
    
    // Check for partner passed from Discovery
    const pendingPartner = sessionStorage.getItem('selected_partner_agent');
    if (pendingPartner) {
        try {
            const partner = JSON.parse(pendingPartner);
            // Auto-fill Avatar 2
            if (document.getElementById('avatar2-nickname')) document.getElementById('avatar2-nickname').value = partner.nickname || '';
            if (document.getElementById('avatar2-age')) document.getElementById('avatar2-age').value = partner.age || '';
            if (document.getElementById('avatar2-gender')) document.getElementById('avatar2-gender').value = partner.gender || 'female';
            if (document.getElementById('avatar2-occupation')) document.getElementById('avatar2-occupation').value = partner.occupation || '';
            if (document.getElementById('avatar2-interests')) document.getElementById('avatar2-interests').value = partner.interests || '';
            if (document.getElementById('avatar2-bio')) document.getElementById('avatar2-bio').value = partner.bio || '';
            
            // Clear it so it doesn't persist forever
            sessionStorage.removeItem('selected_partner_agent');
            
            // Show a nice toast
            showMessage(`Matched with ${partner.nickname}! Their agent is ready.`, 'success');
            
            // Scroll to creation section
            const creationSec = document.getElementById('creation-section');
            if (creationSec) creationSec.scrollIntoView({ behavior: 'smooth' });
            
        } catch (e) {
            console.error('Failed to parse partner data', e);
        }
    }
    
    // If coming from Home scenario, auto-start a quick demo simulation
    const homeScenario = sessionStorage.getItem('home_scenario');
    if (homeScenario) {
        sessionStorage.removeItem('home_scenario');
        // Wait a bit so forms & sample buttons are mounted
        setTimeout(() => {
            try {
                quickDemoFromHome(homeScenario);
            } catch (e) {
                console.error('Quick demo from Home failed', e);
            }
        }, 800);
    }
    bindFeedbackSubmit();
});

// One-click demo: auto-fill both avatars and start simulation (used by Home)
async function quickDemoFromHome(scenarioType) {
    // Fill Avatar 1 (User) with sample 'emma' (or ideally user profile)
    fillSample(1, 'emma');
    
    // Fill Avatar 2 (Partner) logic
    const pendingPartner = sessionStorage.getItem('selected_partner_agent');
    if (pendingPartner && scenarioType === 'spark_match') {
        try {
            const partnerData = JSON.parse(pendingPartner);
            // Populate manually as fillSample uses presets
            if (document.getElementById('avatar2-nickname')) document.getElementById('avatar2-nickname').value = partnerData.nickname || '';
            if (document.getElementById('avatar2-age')) document.getElementById('avatar2-age').value = partnerData.age || '';
            if (document.getElementById('avatar2-gender')) document.getElementById('avatar2-gender').value = partnerData.gender || 'female';
            if (document.getElementById('avatar2-occupation')) document.getElementById('avatar2-occupation').value = partnerData.occupation || '';
            if (document.getElementById('avatar2-interests')) document.getElementById('avatar2-interests').value = partnerData.interests || '';
            if (document.getElementById('avatar2-bio')) document.getElementById('avatar2-bio').value = partnerData.bio || '';
            
            showMessage(`Continuing spark with ${partnerData.nickname}...`, 'success');
            sessionStorage.removeItem('selected_partner_agent');
        } catch (e) {
            console.error("Error parsing partner for Deep Dive", e);
            fillSample(2, 'alex'); // Fallback
        }
    } else {
        // Legacy / Direct scenario fallback
        fillSample(2, 'alex');
    }
    
    // Create avatars on backend
    await createAvatar(1);
    await createAvatar(2);
    
    // Optionally store scenario type for backend/future use
    try {
        window.currentHomeScenario = scenarioType || null;
    } catch (e) {
        console.warn('Unable to store home scenario type', e);
    }
    
    // Start simulation
    startSimulation();
    
    // --- NEW: Replay Spark Dialogue ---
    if (scenarioType === 'spark_match') {
        try {
            const sparkDialogueJson = sessionStorage.getItem('spark_dialogue');
            if (sparkDialogueJson) {
                const dialogue = JSON.parse(sparkDialogueJson);
                
                // Wait for initGameStage to clear content, then append dialogue
                setTimeout(() => {
                    const gameContent = document.getElementById('game-content');
                    if (gameContent && dialogue.length > 0) {
                        // Add a divider
                        const divider = document.createElement('div');
                        divider.className = 'system-event';
                        divider.innerHTML = `<span class="system-badge">PREVIOUSLY</span><div class="system-text">Spark history from Agent Hall</div>`;
                        gameContent.appendChild(divider);
                        
                        dialogue.forEach(line => {
                            // Try to map speaker to left/right
                            // In Hall: "Me" is user, "Partner" is other
                            // In Sandbox: Avatar 1 is user (Right), Avatar 2 is partner (Left)
                            // This mapping is flipped from standard chat UI conventions often, but let's stick to Sandbox convention:
                            // Sandbox: User (Right), Partner (Left)
                            
                            const isMe = line.speaker === 'Me';
                            
                            // Re-use addGameMessage logic but slightly simplified
                            const div = document.createElement('div');
                            div.className = `chat-message ${isMe ? 'message-right' : 'message-left'}`;
                            div.innerHTML = `
                                <div class="bubble-content" style="opacity: 0.8">
                                    ${line.text}
                                </div>
                            `;
                            gameContent.appendChild(div);
                        });
                        
                        gameContent.scrollTop = gameContent.scrollHeight;
                    }
                    sessionStorage.removeItem('spark_dialogue');
                }, 500); // delay slightly to appear after "Initialization complete"
            }
        } catch(e) {
            console.error("Failed to load spark dialogue", e);
        }
    }
}

// Bind "use my profile" quick fill for Avatar1
function bindProfileFillButton() {
    const btn = document.getElementById('fill-from-profile');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            const res = await fetch('/get_user_info', {
                method: 'GET',
                credentials: 'include'
            });
            if (!res.ok) {
                showMessage('Please log in first to use AI Sandbox', 'warning');
                return;
            }
            const data = await res.json();
            if (data.status === 'not_logged_in') {
                showMessage('Please log in first to use AI Sandbox', 'warning');
                return;
            }
            const info = data.information || {};
            // Map user profile to avatar1 fields
            if (info.nickname) document.getElementById('avatar1-nickname').value = info.nickname;
            if (info.age) document.getElementById('avatar1-age').value = parseInt(info.age);
            if (info.gender) document.getElementById('avatar1-gender').value = info.gender;
            if (info.occupation) document.getElementById('avatar1-occupation').value = info.occupation;
            if (info.interests) document.getElementById('avatar1-interests').value = info.interests;
            if (info.bio) document.getElementById('avatar1-bio').value = info.bio;
            showMessage('Pre-filled Avatar 1 with your profile ✨', 'success');
        } catch (e) {
            console.error(e);
            showMessage('Failed to fetch profile, please try again', 'error');
        }
    });
}

// Initialize Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Socket.IO connected');
    });
    
    socket.on('simulation_started', function(data) {
        console.log('Simulation started:', data);
        addLiveUpdate('🚀 ' + data.message);
    });
    
    socket.on('simulation_progress', function(data) {
        console.log('Progress update:', data);
        
        // Determine if it's the user's agent (avatar1)
        // In sandbox, avatar1 is "You" (male or female)
        // data.gender helps, but we need to know which one is avatar1
        // Logic: Check if name matches Avatar 1 (User)
        // Avatar 1 is always "Right" side
        let isUserAgent = false;
        if (avatars.avatar1 && data.avatar_name) {
            // Loose match to handle potential name truncation or case
            isUserAgent = (avatars.avatar1.nickname === data.avatar_name);
        } else {
            // Fallback to gender if name is missing (legacy)
            isUserAgent = (avatars.avatar1 && avatars.avatar1.gender === data.gender);
        }

        // Handle different types of progress updates
        if (data.step === 'scenario_generated') {
            addLiveScenario(data.iteration, data.scenario); // Legacy
            addGameScenario(data.scenario); // NEW
            
        } else if (data.step === 'decision_made') {
            addLiveDecision(data.avatar_name, data.gender, data.decision, data.rationale); // Legacy
            addGameMessage(data.avatar_name, data.gender, data.decision, data.rationale, isUserAgent); // NEW
            
        } else if (data.step === 'rating_updated') {
            // Legacy updates
            const legacyScore = document.getElementById('final-score');
            if (legacyScore) legacyScore.textContent = data.cumulative_rate || '-';
            
            // NEW Game updates
            updateGameScore(data.cumulative_rate);
        }
    });
    
    socket.on('simulation_completed', function(data) {
        console.log('=== SIMULATION COMPLETED EVENT RECEIVED ===');
        console.log('Data:', JSON.stringify(data).substring(0, 500));
        // alert removed // Temporary alert for debugging
        simulationRunning = false;
        
        // Save current simulation for feedback use
        currentSimulation.simulation = data.simulation || [];
        currentSimulation.cumulative_rate = data.cumulative_rate || 25;
        currentSimulation.keyMoments = extractKeyMoments(currentSimulation.simulation);
        // Also save partner info for trajectory
        currentSimulation.partner_persona = avatars.avatar2;

        // Display final results
        displaySimulationResults(data);
        renderObserverComment(currentSimulation);
        renderFeedbackPanel(currentSimulation);
        
        // Auto-scroll to observer/survey area for better UX
        setTimeout(() => {
            const target = document.getElementById('observer-section') || document.getElementById('feedback-section');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 300);
        
        // Update UI
        const startButton = document.getElementById('start-simulation');
        const statusElement = document.getElementById('simulation-status');
        startButton.disabled = false;
        startButton.textContent = '🔄 Run New Simulation';
        startButton.classList.remove('loading');
        statusElement.innerHTML = '<span class="completed">✅ Simulation completed successfully!</span>';
        
        addLiveUpdate('✨ Simulation completed! Final score: ' + data.cumulative_rate + '/50');
    });
    
    socket.on('simulation_error', function(data) {
        console.error('Simulation error:', data);
        simulationRunning = false;
        
        const startButton = document.getElementById('start-simulation');
        const statusElement = document.getElementById('simulation-status');
        startButton.disabled = false;
        startButton.textContent = '🚀 Start AI Love Simulation';
        startButton.classList.remove('loading');
        statusElement.innerHTML = '<span class="error">❌ Simulation failed: ' + data.message + '</span>';
        
        showMessage('Simulation error: ' + data.message, 'error');
    });
}

// Add sample avatar buttons
function addSampleButtons() {
    // Add buttons to Avatar 1 form
    const avatar1Form = document.getElementById('avatar1-form');
    if (!avatar1Form) {
        console.error('[Sandbox] avatar1-form not found!');
        return;
    }
    const sampleButtonsDiv1 = document.createElement('div');
    sampleButtonsDiv1.className = 'sample-buttons';
    sampleButtonsDiv1.innerHTML = `
        <p style="margin: 10px 0 5px; font-size: 12px; color: #666;">Quick Fill:</p>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button type="button" onclick="fillSample(1, 'emma')" class="btn-sample">Emma</button>
            <button type="button" onclick="fillSample(1, 'sophia')" class="btn-sample">Sophia</button>
        </div>
    `;
    avatar1Form.insertBefore(sampleButtonsDiv1, avatar1Form.firstChild);
    
    // Add buttons to Avatar 2 form
    const avatar2Form = document.getElementById('avatar2-form');
    if (!avatar2Form) {
        console.error('[Sandbox] avatar2-form not found!');
        return;
    }
    const sampleButtonsDiv2 = document.createElement('div');
    sampleButtonsDiv2.className = 'sample-buttons';
    sampleButtonsDiv2.innerHTML = `
        <p style="margin: 10px 0 5px; font-size: 12px; color: #666;">Quick Fill:</p>
        <div style="display: flex; gap: 5px; flex-wrap: wrap;">
            <button type="button" onclick="fillSample(2, 'alex')" class="btn-sample">Alex</button>
            <button type="button" onclick="fillSample(2, 'james')" class="btn-sample">James</button>
        </div>
    `;
    avatar2Form.insertBefore(sampleButtonsDiv2, avatar2Form.firstChild);
    
    console.log('[Sandbox] Sample buttons added successfully');
}

// Fill form with sample data
function fillSample(avatarNumber, sampleName) {
    const sample = sampleAvatars[sampleName];
    if (!sample) return;
    
    document.getElementById(`avatar${avatarNumber}-nickname`).value = sample.nickname;
    document.getElementById(`avatar${avatarNumber}-age`).value = sample.age;
    document.getElementById(`avatar${avatarNumber}-gender`).value = sample.gender;
    document.getElementById(`avatar${avatarNumber}-occupation`).value = sample.occupation;
    document.getElementById(`avatar${avatarNumber}-interests`).value = sample.interests;
    document.getElementById(`avatar${avatarNumber}-bio`).value = sample.bio;
    
    showMessage(`Filled Avatar ${avatarNumber} with ${sample.nickname}'s profile! 🎭`, 'info');
}

// Create avatar function
async function createAvatar(avatarNumber) {
    const form = document.getElementById(`avatar${avatarNumber}-form`);
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect avatar data
    const avatarData = {
        nickname: document.getElementById(`avatar${avatarNumber}-nickname`).value,
        age: parseInt(document.getElementById(`avatar${avatarNumber}-age`).value),
        gender: document.getElementById(`avatar${avatarNumber}-gender`).value,
        occupation: document.getElementById(`avatar${avatarNumber}-occupation`).value,
        interests: document.getElementById(`avatar${avatarNumber}-interests`).value,
        bio: document.getElementById(`avatar${avatarNumber}-bio`).value,
        avatar: '/static/avatars/instance.png' // Default avatar
    };
    
    try {
        // Store avatar in session via backend
        const response = await fetch('/sandbox/create_avatar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                avatarNumber: avatarNumber,
                avatarData: avatarData
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'ok') {
            // Store locally
            avatars[`avatar${avatarNumber}`] = avatarData;
            
            // Show preview
            showAvatarPreview(avatarNumber, avatarData);
            
            // Check if both avatars are ready
            checkBothAvatarsReady();
            
            // Show success message
            showMessage(`Avatar ${avatarNumber} created successfully! 🎉`, 'success');
        } else {
            showMessage(`Error creating avatar: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating avatar:', error);
        showMessage('Network error creating avatar', 'error');
    }
}

// Show avatar preview
function showAvatarPreview(avatarNumber, avatarData) {
    const preview = document.getElementById(`avatar${avatarNumber}-preview`);
    const nameElement = document.getElementById(`avatar${avatarNumber}-name`);
    const detailsElement = document.getElementById(`avatar${avatarNumber}-details`);
    
    nameElement.textContent = `${avatarData.nickname}, ${avatarData.age}`;
    detailsElement.textContent = `${avatarData.occupation} • ${avatarData.gender}`;
    
    preview.style.display = 'block';
    preview.classList.add('loading');
    
    setTimeout(() => {
        preview.classList.remove('loading');
    }, 500);
}

// Check if both avatars are ready
function checkBothAvatarsReady() {
    const startButton = document.getElementById('start-simulation');
    const statusElement = document.getElementById('simulation-status');
    
    if (avatars.avatar1 && avatars.avatar2) {
        startButton.disabled = false;
        statusElement.innerHTML = '<span class="ready">✅ Both avatars ready! Click to start simulation</span>';
    } else {
        startButton.disabled = true;
        const count = (avatars.avatar1 ? 1 : 0) + (avatars.avatar2 ? 1 : 0);
        statusElement.innerHTML = `<span class="waiting">⏳ ${count}/2 avatars created. Create ${2-count} more to begin.</span>`;
    }
}

// Start AI simulation
async function startSimulation() {
    if (!avatars.avatar1 || !avatars.avatar2) {
        showMessage('Please create both avatars first', 'error');
        return;
    }
    
    if (!socket || !socket.connected) {
        showMessage('Connection error. Please refresh the page.', 'error');
        return;
    }
    
    simulationRunning = true;
    const startButton = document.getElementById('start-simulation');
    const statusElement = document.getElementById('simulation-status');
    const resultsSection = document.getElementById('results-section');
    
    // Update UI
    startButton.disabled = true;
    startButton.textContent = '🤖 AI Simulation Running...';
    startButton.classList.add('loading');
    statusElement.innerHTML = '<span class="running loading-dots">🔄 AI agents are interacting</span>';
    
    // Show results section with live updates
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    // Initialize results display
    initializeResultsDisplay();
    
    // Clear previous live updates
    const timelineContainer = document.getElementById('timeline-container');
    if (timelineContainer) timelineContainer.innerHTML = '<div id="live-updates" class="live-updates"></div>';
    
    // Initialize Game Stage
    initGameStage();
    
    // Emit to Socket.IO
    console.log('[DEBUG] About to emit start_sandbox_simulation');
    console.log('[DEBUG] Socket connected:', socket.connected);
    console.log('[DEBUG] Avatar1:', avatars.avatar1?.nickname);
    console.log('[DEBUG] Avatar2:', avatars.avatar2?.nickname);
    
    socket.emit('start_sandbox_simulation', {
        avatar1: avatars.avatar1,
        avatar2: avatars.avatar2
    });
    
    console.log('[DEBUG] Emitted start_sandbox_simulation');
    
    // Safety timeout
    setTimeout(() => {
        if (simulationRunning && document.getElementById('game-content').children.length <= 1) {
            // If still running but no content after 30s (only system init msg)
            showMessage('Simulation is taking longer than expected. Please check your connection.', 'warning');
            
            // Reset button to allow retry
            const startButton = document.getElementById('start-simulation');
            const statusElement = document.getElementById('simulation-status');
            startButton.disabled = false;
            startButton.textContent = '🔄 Retry Simulation';
            startButton.classList.remove('loading');
            statusElement.innerHTML = '<span class="error">⚠️ Connection timed out. Try again?</span>';
            simulationRunning = false;
        }
    }, 30000); // 30s timeout
}

// Initialize results display
function initializeResultsDisplay() {
    const fs1 = document.getElementById('final-score'); if (fs1) fs1.textContent = '-';
    const se1 = document.getElementById('score-emoji'); if (se1) se1.textContent = '⏳';
    const tc1 = document.getElementById('timeline-container'); if (tc1) tc1.innerHTML = '<p class="loading-text">AI agents are interacting...</p>';
    const insightsEl = document.getElementById('insights-container');
    if (insightsEl) insightsEl.innerHTML = '<p class="loading-text">Analyzing compatibility...</p>';
    const feedbackSection = document.getElementById('feedback-section');
    if (feedbackSection) {
        feedbackSection.style.display = 'none';
        const keyContainer = document.getElementById('key-moments-container');
        if (keyContainer) keyContainer.innerHTML = '';
    }
}

// Display simulation results
function displaySimulationResults(result) {
    // Display compatibility score
    const score = result.cumulative_rate || 25;
    const fs2 = document.getElementById('final-score'); if (fs2) fs2.textContent = score;
    
    // Update score emoji
    updateScoreEmoji(score);
    
    // Display interaction timeline
    displayTimeline(result.simulation || []);
    
    // Display insights
    displayInsights(result);
}

// Add live update message
function addLiveUpdate(message) {
    const liveUpdatesDiv = document.getElementById('live-updates');
    if (!liveUpdatesDiv) return;
    
    const updateElement = document.createElement('div');
    updateElement.className = 'live-update';
    updateElement.innerHTML = `
        <div class="update-message">${message}</div>
        <div class="update-time">${new Date().toLocaleTimeString()}</div>
    `;
    liveUpdatesDiv.appendChild(updateElement);
    
    // Auto-scroll to bottom
    liveUpdatesDiv.scrollTop = liveUpdatesDiv.scrollHeight;
}

// Update score emoji in real-time
function updateScoreEmoji(score) {
    const emojiMap = {
        0: '💔', 10: '😐', 20: '🙂', 30: '😊', 40: '😍', 50: '💕'
    };
    const emojiKey = Math.floor(score / 10) * 10;
    const se2 = document.getElementById('score-emoji'); if (se2) se2.textContent = emojiMap[emojiKey] || '💝';
}

// Display interaction timeline as "episodes"
function displayTimeline(simulationData) {
    const timelineContainer = document.getElementById('timeline-container');
    if (!timelineContainer) return; // New UI: timeline may be hidden/absent
    timelineContainer.innerHTML = '';
    
    if (!simulationData || simulationData.length === 0) {
        timelineContainer.innerHTML = '<p class="no-data">No simulation data available</p>';
        return;
    }
    
    // Group events into episodes: Host state -> Agent decision -> Host state ...
    let episodeIndex = 0;
    for (let i = 0; i < simulationData.length; ) {
        const hostState = simulationData[i];
        const decision = simulationData[i + 1];
        const nextState = simulationData[i + 2];
        
        if (!hostState || !hostState.action) break;
        episodeIndex += 1;
        
        const epDiv = document.createElement('div');
        epDiv.className = 'timeline-event episode-card';
        
        const question = hostState.action.question || 'A new moment in this relationship...';
        const scenarioTitle = `Episode ${episodeIndex}: ${truncateText(question, 40)}`;
        
        // Determine whose decision this is
        let yourDecision = null;
        let partnerDecision = null;
        if (decision && decision.gender) {
            if (isYourGender(decision.gender)) {
                yourDecision = decision;
            } else {
                partnerDecision = decision;
            }
        }
        
        const scoreAfter = (nextState && nextState.cumulative_rate) || hostState.cumulative_rate || '-';
        const scoreDesc = getCompatibilityDescription(parseInt(scoreAfter || '25', 10));
        
        epDiv.innerHTML = `
            <div class="event-title">${scenarioTitle}</div>
            <div class="event-content">
                <div class="episode-scenario">
                    <strong>🎬 Scenario:</strong> ${question}
                </div>
                <div class="episode-decisions">
                    <div class="episode-decision you-decision">
                        <strong>You (Your Agent):</strong>
                        ${formatDecisionBlock(yourDecision)}
                    </div>
                    <div class="episode-decision partner-decision">
                        <strong>Partner:</strong>
                        ${formatDecisionBlock(partnerDecision)}
                    </div>
                </div>
                <div class="episode-score">
                    💕 Compatibility after this round: <span class="score-number">${scoreAfter}/50</span> · ${scoreDesc}
                </div>
            </div>
            <div class="event-time">
                Step ${i + 1} 
                <button class="btn-branch" onclick="branchSimulation(${i})">✂️ Branch / Correct</button>
            </div>
        `;
        
        timelineContainer.appendChild(epDiv);
        i += 3; // move to next episode group
    }
}

// Branch/Correct Simulation Stub
function branchSimulation(stepIndex) {
    // For now, just show an alert as backend support is needed
    // In a real implementation, this would open a modal to input "Correct Action"
    // and then send a request to restart simulation from this step with the forced action.
    const action = prompt("How would you react differently in this scenario?", "I would...");
    if (action) {
        alert(`Correction recorded: "${action}". \n\nBranching feature is coming soon! This will restart the simulation from Step ${stepIndex + 1} with your new action.`);
    }
}

function truncateText(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

// naive helper to treat first avatar as "you"
function isYourGender(gender) {
    // In sandbox simulation we don't have explicit mapping, so we treat both equally.
    // For episode view, just return true to render decision as "you" when available.
    return true;
}

function formatDecisionBlock(decisionObj) {
    if (!decisionObj || !decisionObj.decision) {
        return '<span class="muted">(Partner acted first or no decision to show)</span>';
    }
    const opt = decisionObj.decision.option || decisionObj.decision.Option || '';
    const content = decisionObj.decision.content || decisionObj.decision.Content || '';
    const rationale = decisionObj.rationale || '';
    return `
        <div><strong>Choice:</strong> ${opt || '—'} ${content || ''}</div>
        <div class="episode-rationale"><strong>Inner thought:</strong> <em>${rationale || '(No details)'}</em></div>
    `;
}

// Display AI insights
function displayInsights(result) {
    const insights = [
        {
            label: '🎯 Compatibility Rating',
            value: `${result.cumulative_rate || 25}/50 - ${getCompatibilityDescription(result.cumulative_rate || 25)}`
        },
        {
            label: '🧠 AI Processing',
            value: `Multi-agent simulation completed with ${(result.simulation || []).length} interaction points`
        },
        {
            label: '📊 Simulation Quality',
            value: 'High-fidelity personality modeling with Agent Loop feedback'
        },
        {
            label: '⚡ Processing Time',
            value: 'Real-time AI decision making and scenario generation'
        }
    ];
    
    const insightsContainer = document.getElementById('insights-container'); // May be null in new UI
    if (!insightsContainer) return;
    insightsContainer.innerHTML = '';
    
    insights.forEach(insight => {
        const insightElement = document.createElement('div');
        insightElement.className = 'insight-item';
        insightElement.innerHTML = `
            <div class="insight-label">${insight.label}</div>
            <div class="insight-value">${insight.value}</div>
        `;
        insightsContainer.appendChild(insightElement);
    });
}

// Extract key moments (first, conflict-like, last) for feedback
function extractKeyMoments(simulationData) {
    if (!simulationData || simulationData.length === 0) return [];
    const moments = [];
    
    // Helper to create a moment object
    function buildMoment(index, label) {
        const hostState = simulationData[index];
        const decision = simulationData[index + 1];
        if (!hostState || !hostState.action) return null;
        const question = hostState.action.question || '';
        const dec = decision && decision.decision ? decision.decision : {};
        return {
            index,
            label,
            scenario: question,
            option: dec.option || dec.Option || '',
            content: dec.content || dec.Content || '',
            rationale: (decision && decision.rationale) || ''
        };
    }
    
    // 1. first moment
    const first = buildMoment(0, 'First Meeting');
    if (first) moments.push(first);
    
    // 2. conflict-like moment (search question text)
    const conflictKeywords = ['argue', 'conflict', 'disagree', 'tension', 'problem', 'issue', 'difficult'];
    for (let i = 0; i < simulationData.length - 1; i += 3) {
        const s = simulationData[i];
        if (!s || !s.action || !s.action.question) continue;
        const q = s.action.question.toLowerCase();
        if (conflictKeywords.some(k => q.includes(k))) {
            const conflict = buildMoment(i, 'Conflict Point');
            if (conflict) moments.push(conflict);
            break;
        }
    }
    
    // 3. last moment before end
    for (let i = simulationData.length - 3; i >= 0; i -= 3) {
        const last = buildMoment(i, 'Final Scene');
        if (last) {
            if (!moments.find(m => m.index === last.index)) {
                moments.push(last);
            }
            break;
        }
    }
    
    // De-duplicate by index
    const unique = [];
    const seen = new Set();
    for (const m of moments) {
        if (!seen.has(m.index)) {
            seen.add(m.index);
            unique.push(m);
        }
    }
    return unique;
}

// Render feedback panel with key moments
function renderFeedbackPanel(simulationState) {
    const feedbackSection = document.getElementById('feedback-section');
    const container = document.getElementById('key-moments-container');
    if (!feedbackSection || !container) return;
    
    // Always show feedback section when simulation completes
    feedbackSection.style.display = 'block';
    
    // Clear container (User requested to remove per-moment feedback)
    container.innerHTML = '<p class="feedback-intro-note">Review the timeline above to branch or correct specific moments.</p>';
    
    feedbackSection.style.display = 'block';
}

// Bind feedback submit button
function bindFeedbackSubmit() {
    const btn = document.getElementById('submit-feedback');
    if (!btn) return;
    btn.addEventListener('click', async () => {
        if (!currentSimulation || !currentSimulation.simulation.length) {
            showMessage('Please complete a simulation first before submitting feedback', 'warning');
            return;
        }
        const payload = collectFeedbackPayload();
        try {
            const res = await fetch('/sandbox/feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                showMessage('Submit failed, please try again', 'error');
                return;
            }
            const data = await res.json();
            if (data.status === 'ok') {
                showMessage('Thank you for your feedback! 🎉 Your love story has been saved.', 'success');
                // Optionally refresh trajectory if visible
                if (document.getElementById('trajectory-section').style.display !== 'none') {
                    loadTrajectory();
                }
            } else {
                showMessage('Submit failed, please try again', 'error');
            }
        } catch (e) {
            console.error(e);
            showMessage('Network error, submit failed', 'error');
        }
    });
}

// Collect feedback payload
function collectFeedbackPayload() {
    const keyMoments = currentSimulation.keyMoments || [];
    const momentFeedback = [];
    keyMoments.forEach((m, idx) => {
        const momentId = `moment-${idx}`;
        const card = document.querySelector(`.key-moment-card:nth-child(${idx + 1})`);
        if (!card) return;
        const selected = card.querySelector(`input[name="${momentId}-likeness"]:checked`);
        const likeness = selected ? selected.value : null;
        const extraDiv = card.querySelector(`#${momentId}-extra`);
        const extras = [];
        if (extraDiv && extraDiv.style.display !== 'none') {
            extraDiv.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                extras.push(cb.value);
            });
        }
        const extraTextEl = extraDiv ? extraDiv.querySelector('.extra-text') : null;
        const extraText = extraTextEl ? extraTextEl.value : '';
        momentFeedback.push({
            scenario: m.scenario,
            option: m.option,
            content: m.content,
            rationale: m.rationale,
            likeness,
            deviation_tags: extras,
            deviation_text: extraText
        });
    });
    
    const likenessScore = parseInt(document.getElementById('likeness-score').value, 10);
    
    // Collect survey responses
    const engagement = document.querySelector('input[name="engagement"]:checked')?.value || '';
    const scenarioFeel = Array.from(document.querySelectorAll('input[name="scenario-feel"]:checked')).map(el => el.value);
    const useCase = Array.from(document.querySelectorAll('input[name="use-case"]:checked')).map(el => el.value);
    const improvements = Array.from(document.querySelectorAll('input[name="improvements"]:checked')).map(el => el.value);
    const optionalComment = document.getElementById('optional-feedback-text') ? document.getElementById('optional-feedback-text').value : '';
    
    return {
        cumulative_rate: currentSimulation.cumulative_rate,
        simulation: currentSimulation.simulation,  // Full simulation for replay
        moment_feedback: momentFeedback,
        global_feedback: {
            likeness_score: likenessScore,
            engagement: engagement,
            scenario_feel: scenarioFeel,
            use_case: useCase,
            improvements: improvements,
            optional_comment: optionalComment
        },
        // Persona snapshots for trajectory
        persona: avatars.avatar1 ? {
            nickname: avatars.avatar1.nickname,
            age: avatars.avatar1.age,
            gender: avatars.avatar1.gender,
            occupation: avatars.avatar1.occupation
        } : null,
        partner_persona: avatars.avatar2 ? {
            nickname: avatars.avatar2.nickname,
            age: avatars.avatar2.age,
            gender: avatars.avatar2.gender,
            occupation: avatars.avatar2.occupation
        } : null,
        simulation_length: (currentSimulation.simulation || []).length
    };
}

// Render a lightweight observer-style comment
function renderObserverComment(simulationState) {
    // Show the observer section
    const observerSection = document.getElementById('observer-section');
    if (observerSection) observerSection.style.display = 'block';
    
    const card = document.getElementById('observer-card');
    const p = document.getElementById('observer-comment');
    const statsDiv = document.getElementById('observer-stats');
    if (!card || !p) return;
    
    const score = simulationState.cumulative_rate || 25;
    const desc = getCompatibilityDescription(score);
    
    // Rough trajectory analysis
    const sims = simulationState.simulation || [];
    let ups = 0;
    let downs = 0;
    let turningPoint = null;
    let maxChange = 0;
    
    for (let i = 3; i < sims.length; i += 3) {
        const prev = sims[i - 3] && sims[i - 3].cumulative_rate;
        const cur = sims[i] && sims[i].cumulative_rate;
        if (!prev || !cur) continue;
        const change = parseInt(cur) - parseInt(prev);
        if (change > 0) ups++;
        else if (change < 0) downs++;
        if (Math.abs(change) > maxChange) {
            maxChange = Math.abs(change);
            turningPoint = { index: i, change: change, question: sims[i - 3]?.action?.question || '' };
        }
    }
    
    // Determine relationship dynamic
    let dynamic = '';
    if (ups > downs * 2) dynamic = '🌸 Blossoming Romance';
    else if (downs > ups * 2) dynamic = '🌊 Rocky Waters';
    else if (ups > downs) dynamic = '☀️ Warming Up';
    else if (downs > ups) dynamic = '🌧️ Cooling Down';
    else dynamic = '⚖️ Balanced Exploration';
    
    // Determine agent style
    let style = '';
    if (score >= 35 && ups > downs) style = '💕 Romantic & Open';
    else if (score >= 25 && ups === downs) style = '🤔 Cautious & Measured';
    else if (downs > ups) style = '🛡️ Guarded & Protective';
    else style = '🌱 Curious & Tentative';
    
    // Generate comment
    let mood = '';
    if (score >= 40) mood = 'This felt like a "made for each other" finale! 💕';
    else if (score >= 30) mood = 'Good chemistry with room to grow.';
    else if (score >= 20) mood = 'A cautious dance — neither fully committing.';
    else mood = 'This pairing faced significant challenges.';
    
    p.textContent = `Final Score: ${score}/50 (${desc}). ${mood}`;
    
    // Populate stats
    if (statsDiv) {
        statsDiv.style.display = 'block';
        const statDynamic = document.getElementById('stat-dynamic');
        const statStyle = document.getElementById('stat-style');
        const statTurning = document.getElementById('stat-turning');
        
        if (statDynamic) statDynamic.textContent = dynamic;
        if (statStyle) statStyle.textContent = style;
        
        if (turningPoint && turningPoint.question) {
            const turnText = turningPoint.change > 0 ? '📈 Positive shift' : '📉 Tension moment';
            if (statTurning) statTurning.textContent = turnText;
        } else {
            if (statTurning) statTurning.textContent = '— Steady progression';
        }
    }
}

// Get compatibility description
function getCompatibilityDescription(score) {
    if (score >= 45) return 'Excellent Match! 💕';
    if (score >= 35) return 'Great Compatibility 😍';
    if (score >= 25) return 'Good Potential 😊';
    if (score >= 15) return 'Some Challenges 🤔';
    return 'Low Compatibility 💔';
}

// Toggle collapsible sections
function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const toggleId = sectionId.replace('-section', '-toggle');
    const toggle = document.getElementById(toggleId);
    
    if (section.classList.contains('collapsed')) {
        section.classList.remove('collapsed');
        if (toggle) toggle.textContent = '▼';
    } else {
        section.classList.add('collapsed');
        if (toggle) toggle.textContent = '▶';
    }
}

// Show message function (clean, single implementation)
function showMessage(msg, type = 'info') {
    let messageElement = document.getElementById('message-toast');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'message-toast';
        document.body.appendChild(messageElement);
    }
    
    // Reset classes
    messageElement.className = 'message-toast';
    messageElement.classList.add(type);
    
    // Set text
    messageElement.textContent = msg;
    
    // Clear inline styles that might interfere
    messageElement.style = '';
    
    // Force reflow
    void messageElement.offsetWidth;
    
    // Show (CSS animation handles the slide in)
    messageElement.classList.add('show');
    
    // Hide after 3s
    setTimeout(() => {
        messageElement.classList.remove('show');
    }, 3000);
}

// Add live scenario update with clear formatting
function addLiveScenario(stepNumber, scenario) {
    const liveContainer = document.getElementById('live-updates');
    if (!liveContainer) return;
    
    const scenarioDiv = document.createElement('div');
    scenarioDiv.className = 'live-scenario';
    scenarioDiv.innerHTML = `
        <div class="scenario-header">
            <span class="scenario-number">🎬 Scenario ${stepNumber}</span>
            <span class="scenario-label">AI Dating Engine</span>
        </div>
        <div class="scenario-content">${scenario}</div>
    `;
    liveContainer.appendChild(scenarioDiv);
    liveContainer.scrollTop = liveContainer.scrollHeight;
}

// Add live avatar decision with clear person identification
function addLiveDecision(avatarName, gender, decision, rationale) {
    const liveContainer = document.getElementById('live-updates');
    if (!liveContainer) return;
    
    const genderIcon = gender === 'male' ? '👨' : gender === 'female' ? '👩' : '👤';
    const genderColor = gender === 'male' ? '#4A90E2' : gender === 'female' ? '#FF69B4' : '#9B59B6';
    
    const decisionDiv = document.createElement('div');
    decisionDiv.className = 'live-decision';
    decisionDiv.style.borderLeftColor = genderColor;
    decisionDiv.innerHTML = `
        <div class="decision-header">
            <span class="avatar-name">${genderIcon} ${avatarName}</span>
            <span class="decision-badge" style="background: ${genderColor}">Response</span>
        </div>
        <div class="decision-content">
            <div class="decision-option"><strong>Choice:</strong> ${decision.Option || 'N/A'}</div>
            <div class="decision-action"><strong>Action:</strong> ${decision.Content || 'N/A'}</div>
        </div>
        <div class="decision-rationale">
            <span class="thought-icon">💭</span> <em>"${rationale}"</em>
        </div>
    `;
    liveContainer.appendChild(decisionDiv);
    liveContainer.scrollTop = liveContainer.scrollHeight;
}

// ========== Love Trajectory Functions ==========

// Show trajectory section, hide creation section
function showTrajectorySection() {
    // Reset simulation state completely
    simulationRunning = false;
    
    // Reset UI elements
    const startButton = document.getElementById('start-simulation');
    if (startButton) {
        startButton.disabled = false;
        startButton.textContent = '🚀 Start AI Love Simulation';
        startButton.classList.remove('loading');
    }
    
    const statusElement = document.getElementById('simulation-status');
    if (statusElement) {
        statusElement.innerHTML = '<span class="waiting">⏳ Create both avatars to begin simulation</span>';
    }
    
    // Hide other sections (with null checks)
    const creationSec = document.getElementById('creation-section');
    const simulationSec = document.getElementById('simulation-section');
    const resultsSec = document.getElementById('results-section');
    const trajectorySec = document.getElementById('trajectory-section');
    
    if (creationSec) creationSec.style.display = 'none';
    if (simulationSec) simulationSec.style.display = 'none';
    if (resultsSec) resultsSec.style.display = 'none';
    if (trajectorySec) trajectorySec.style.display = 'block';
    
    loadTrajectory();
}

// Show creation section, hide trajectory
function showCreationSection() {
    const trajectorySec = document.getElementById('trajectory-section');
    const creationSec = document.getElementById('creation-section');
    const simulationSec = document.getElementById('simulation-section');
    
    if (trajectorySec) trajectorySec.style.display = 'none';
    if (creationSec) creationSec.style.display = 'block';
    if (simulationSec) simulationSec.style.display = 'block';
}

// Load and display trajectory history
async function loadTrajectory() {
    const container = document.getElementById('trajectory-list');
    if (!container) return;
    
    container.innerHTML = '<p class="loading-text">Loading your love trajectory...</p>';
    
    try {
        const res = await fetch('/sandbox/trajectory', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!res.ok) {
            container.innerHTML = '<p class="no-data">Failed to load trajectory. Please try again.</p>';
            return;
        }
        
        const data = await res.json();
        if (data.status !== 'ok' || !data.simulations || data.simulations.length === 0) {
            container.innerHTML = `
                <div class="no-data-card">
                    <p>📭 No love stories yet!</p>
                    <p>Create your first simulation to start tracking your agent's dating journey.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        
        // Show summary stats
        const avgScore = data.simulations.reduce((sum, s) => sum + (s.cumulative_rate || 25), 0) / data.simulations.length;
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'trajectory-summary';
        summaryDiv.innerHTML = `
            <div class="summary-stats">
                <div class="stat-item">
                    <div class="stat-value">${data.simulations.length}</div>
                    <div class="stat-label">Total Stories</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Math.round(avgScore)}</div>
                    <div class="stat-label">Avg Compatibility</div>
                </div>
            </div>
        `;
        container.appendChild(summaryDiv);
        
        // Show each simulation
        data.simulations.forEach((sim, idx) => {
            const card = document.createElement('div');
            card.className = 'trajectory-card';
            const date = new Date(sim.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const partner = sim.avatar2 || sim.partner_persona || {};
            const score = sim.cumulative_rate || 25;
            const scoreDesc = getCompatibilityDescription(score);
            
            card.innerHTML = `
                <div class="trajectory-card-header">
                    <div class="trajectory-partner">
                        <strong>${partner.nickname || 'Unknown'}</strong>
                        <span class="partner-details">${partner.age || ''}${partner.age && partner.occupation ? ' · ' : ''}${partner.occupation || ''}</span>
                    </div>
                    <div class="trajectory-score">
                        <span class="score-badge">${score}/50</span>
                        <span class="score-desc">${scoreDesc}</span>
                    </div>
                </div>
                <div class="trajectory-card-body">
                    <div class="trajectory-meta">
                        <span>📅 ${date}</span>
                        ${sim.feedback && sim.feedback.likeness_score ? 
                            `<span>👤 Likeness: ${sim.feedback.likeness_score}/10</span>` : ''}
                    </div>
                </div>
                <div class="trajectory-card-actions">
                    <button class="btn-sample" onclick="replaySimulation('${sim._id}')">
                        ▶️ Replay Story
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) {
        console.error('Load trajectory error:', e);
        container.innerHTML = '<p class="no-data">Error loading trajectory. Please refresh the page.</p>';
    }
}

// Replay a past simulation
async function replaySimulation(simulationId) {
    try {
        const res = await fetch(`/sandbox/simulation/${simulationId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!res.ok) {
            showMessage('Failed to load simulation', 'error');
            return;
        }
        
        const data = await res.json();
        if (data.status !== 'ok') {
            showMessage('Simulation not found', 'error');
            return;
        }
        
        const sim = data.simulation;
        
        // Switch to results view
        showCreationSection();
        const resultsSecReplay = document.getElementById('results-section');
        if (resultsSecReplay) {
            resultsSecReplay.style.display = 'block';
            resultsSecReplay.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Display the simulation
        displaySimulationResults({
            simulation: sim.simulation || [],
            cumulative_rate: sim.cumulative_rate || 25
        });
        
        // Show observer comment if we have the data
        if (sim.simulation) {
            const simState = {
                simulation: sim.simulation,
                cumulative_rate: sim.cumulative_rate || 25
            };
            renderObserverComment(simState);
        }
        
        showMessage('Simulation loaded! Scroll down to see the full story.', 'success');
    } catch (e) {
        console.error('Replay error:', e);
        showMessage('Error loading simulation', 'error');
    }
}
// ========== NEW: Game Stage Rendering ==========

function initGameStage() {
    const gameContent = document.getElementById('game-content');
    if (gameContent) {
        gameContent.innerHTML = ''; // Clear previous game
        // Add initial system message
        const initMsg = document.createElement('div');
        initMsg.className = 'system-event';
        initMsg.innerHTML = `
            <span class="system-badge">SYSTEM</span>
            <div class="system-text">Initialization complete. Simulation starting...</div>
        `;
        gameContent.appendChild(initMsg);
    }
    
    // Set avatars
    if (avatars.avatar1 && avatars.avatar2) {
        const charRight = document.getElementById('char-name-right');
        const charLeft = document.getElementById('char-name-left');
        const avatarRight = document.getElementById('char-avatar-right');
        const avatarLeft = document.getElementById('char-avatar-left');
        
        if (charRight) charRight.textContent = avatars.avatar1?.nickname || 'You';
        if (charLeft) charLeft.textContent = avatars.avatar2?.nickname || 'Partner';
        
        // Set premium SVG avatars
        if (avatarRight) avatarRight.innerHTML = getGenderAvatarSVG(avatars.avatar1?.gender);
        if (avatarLeft) avatarLeft.innerHTML = getGenderAvatarSVG(avatars.avatar2?.gender);
    }
}

function addToGameChat(element) {
    const gameContent = document.getElementById('game-content');
    if (gameContent) {
        gameContent.appendChild(element);
        gameContent.scrollTop = gameContent.scrollHeight;
    }
}

function addGameScenario(scenario) {
    const div = document.createElement('div');
    div.className = 'system-event';
    div.innerHTML = `
        <span class="system-badge">SCENARIO</span>
        <div class="system-text">${scenario}</div>
    `;
    addToGameChat(div);
    
    // Show typing indicator while AI generates response
    showTypingIndicator();
}

function showTypingIndicator() {
    hideTypingIndicator(); // Remove existing if any
    const div = document.createElement('div');
    div.id = 'typing-indicator';
    div.className = 'typing-indicator';
    div.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-text">AI is thinking...</span>
    `;
    addToGameChat(div);
}

function hideTypingIndicator() {
    const existing = document.getElementById('typing-indicator');
    if (existing) existing.remove();
}

function addGameMessage(avatarName, gender, decision, rationale, isUserAgent) {
    hideTypingIndicator(); // Remove typing indicator when message arrives
    const div = document.createElement('div');
    div.className = `chat-message ${isUserAgent ? 'message-right' : 'message-left'}`;
    
    const actionContent = decision.Content || decision.content || '';
    const option = decision.Option || decision.option || '';
    
    div.innerHTML = `
        <div class="bubble-content">
            ${option ? `<span class="bubble-action">Option ${option} selected</span>` : ''}
            ${actionContent}
        </div>
        ${rationale ? `<div class="thought-bubble">💭 ${rationale}</div>` : ''}
    `;
    addToGameChat(div);
}

function updateGameScore(score) {
    const gameScoreVal = document.getElementById('game-score-val');
    const gameScoreEmoji = document.getElementById('game-score-emoji');
    if (gameScoreVal) gameScoreVal.textContent = score;
    if (gameScoreEmoji) gameScoreEmoji.textContent = getScoreEmoji(score);
    
    // Add small notification in chat
    const div = document.createElement('div');
    div.className = 'score-update-pill';
    div.innerHTML = `💕 Compatibility updated to ${score}/50`;
    addToGameChat(div);
}

function getScoreEmoji(score) {
    if (score >= 45) return '💖';
    if (score >= 35) return '🥰';
    if (score >= 25) return '😊';
    if (score >= 15) return '😐';
    return '💔';
}

function checkPrefill() {
    const prefillData = sessionStorage.getItem('sandbox_partner_prefill');
    if (prefillData) {
        try {
            const data = JSON.parse(prefillData);
            console.log("Found partner prefill:", data);
            
            // Fill Avatar 2 form
            if (document.getElementById('avatar2-nickname')) document.getElementById('avatar2-nickname').value = data.nickname || '';
            if (document.getElementById('avatar2-age')) document.getElementById('avatar2-age').value = data.age || '';
            if (document.getElementById('avatar2-gender')) document.getElementById('avatar2-gender').value = data.gender || 'female';
            if (document.getElementById('avatar2-occupation')) document.getElementById('avatar2-occupation').value = data.occupation || '';
            if (document.getElementById('avatar2-interests')) document.getElementById('avatar2-interests').value = data.interests || '';
            if (document.getElementById('avatar2-bio')) document.getElementById('avatar2-bio').value = data.bio || '';
            
            // Clear it so it doesn't persist forever
            sessionStorage.removeItem('sandbox_partner_prefill');
            
            showMessage('Partner loaded from Dating Hall! 💕', 'success');
            
            // Update global avatars object if needed (will be updated on input change anyway, but good to sync)
            // But our code updates 'avatars' on input change events usually.
            // Let's manually trigger input events to ensure state sync
            setTimeout(() => {
                const inputs = document.querySelectorAll('#avatar2-form input, #avatar2-form select, #avatar2-form textarea');
                inputs.forEach(input => {
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
            }, 500);
            
        } catch (e) {
            console.error("Error parsing prefill data", e);
        }
    }
}

// Check if we need to auto-fill partner from Discovery page
function checkAutoFill() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auto_fill_partner') === 'true') {
        try {
            const partnerData = JSON.parse(localStorage.getItem('sandbox_partner_preset'));
            if (partnerData) {
                fillAvatarForm(2, partnerData);
                avatars.avatar2 = partnerData;
                showMessage(`Selected partner: ${partnerData.name}`, 'success');
                localStorage.removeItem('sandbox_partner_preset');
                window.scrollTo(0, 0);
            }
        } catch (e) {
            console.error("Failed to auto-fill partner", e);
        }
    }
    
    // DEFAULT AUTO-FILL FOR SANDBOX
    // Always pre-fill with sample profiles for easy testing
    setTimeout(() => {
        const name1 = document.getElementById('avatar1-nickname');
        const name2 = document.getElementById('avatar2-nickname');
        // Only fill if both are empty (not already filled by other methods)
        if (name1 && !name1.value && name2 && !name2.value) {
            console.log('[Sandbox] Auto-filling default profiles...');
            fillSample(1, 'emma'); 
            fillSample(2, 'alex');
            showMessage('✨ Auto-filled default profiles for quick testing!', 'info');
        }
    }, 800);
}

// Helper to fill form from data object (Refactored from duplicate code)
function fillAvatarForm(avatarNum, data) {
    if (!data) return;
    const prefix = `avatar${avatarNum}`;
    if (document.getElementById(`${prefix}-nickname`)) document.getElementById(`${prefix}-nickname`).value = data.name || data.nickname || '';
    if (document.getElementById(`${prefix}-age`)) document.getElementById(`${prefix}-age`).value = data.age || '';
    if (document.getElementById(`${prefix}-gender`)) document.getElementById(`${prefix}-gender`).value = data.gender || 'female';
    if (document.getElementById(`${prefix}-occupation`)) document.getElementById(`${prefix}-occupation`).value = data.occupation || '';
    if (document.getElementById(`${prefix}-interests`)) document.getElementById(`${prefix}-interests`).value = data.interests || '';
    if (document.getElementById(`${prefix}-bio`)) document.getElementById(`${prefix}-bio`).value = data.bio || '';
}

// Helper to get Premium SVG Avatar
function getGenderAvatarSVG(gender) {
    // Premium Gradient SVGs
    const svgMale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gM' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#a1c4fd'/><stop offset='100%' stop-color='#c2e9fb'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gM)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    
    const svgFemale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gF' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#fdcbf1'/><stop offset='100%' stop-color='#e6dee9'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gF)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    
    const svgNeutral = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gN' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#cfd9df'/><stop offset='100%' stop-color='#e2ebf0'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gN)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    
    if (gender === 'male') return svgMale;
    if (gender === 'female') return svgFemale;
    return svgNeutral;
}
