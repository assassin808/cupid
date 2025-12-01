// Agent Hall Logic - "Love First, Know Later" - Living Mingle Version

// Simple hash → pastel color helper
function hashStringToHue(str) {
    let hash = 0;
    if (!str) return 200;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
}

// Global variables
let hallContainer = null;
let agents = [];
let isPaused = false;
let animationFrameId = null;
let lastEncounterTime = 0;
let currentPartnerData = null;

// Relationship tracking: { agentId: { targetId: score } }
// Positive score = attraction, Negative = repulsion
let relationships = {};

const ENCOUNTER_COOLDOWN = 8000;
const MINGLE_INTERVAL = 4000; // New chat every 4 seconds
const SPEECH_DURATION = 3500;

// Params for Organic Movement
const MAX_SPEED = 0.3;
const SEPARATION_RADIUS = 90;
const BOUNDARY_MARGIN = 70;
const ATTRACTION_RADIUS = 200;
const ATTRACTION_STRENGTH = 0.02;
// Waypoint params
const IDLE_TIME_MIN = 100; // frames
const IDLE_TIME_MAX = 300;
const ARRIVAL_RADIUS = 30;

// Conversation starters and responses
const CONVERSATION_STARTERS = [
    "Anyone into hiking?",
    "Love this weather!",
    "Coffee or tea?",
    "What's everyone reading?",
    "Travel plans anyone?",
    "Music recommendations?",
    "Best restaurant nearby?",
    "Working on anything fun?",
    "Morning person or night owl?",
    "Favorite movie genre?"
];

const POSITIVE_RESPONSES = [
    "Oh yes! Me too!",
    "Totally agree!",
    "Love that!",
    "Same here! 😊",
    "You get me!",
    "Finally someone!",
    "Let's chat more!",
    "Interesting!",
    "Tell me more!"
];

const NEUTRAL_RESPONSES = [
    "Hmm, maybe.",
    "Not sure...",
    "Could be.",
    "Interesting take.",
    "I see."
];

const NEGATIVE_RESPONSES = [
    "Not really my thing.",
    "Eh, pass.",
    "We're different.",
    "Hard disagree.",
    "Nope."
];

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    hallContainer = document.getElementById('agent-hall-container');
    if (hallContainer) {
        initHall();
    } else {
        console.warn('Agent Hall container not found');
    }
});

function initHall() {
    if (!hallContainer) {
        console.error('hallContainer is null');
        return;
    }
    
    console.log('Initializing Agent Hall with Mingle...');
    
    // 1. Create My Agent
    createAgentBlob('me', 'Me', true, { 
        id: 'me', 
        name: 'Me', 
        bio: 'Looking for connection',
        interests: ['music', 'travel', 'coffee']
    });
    
    // 2. Fetch and Create Others (API)
    fetch('/api/hall/agents')
        .then(res => res.json())
        .then(data => {
            console.log('Hall agents loaded:', data);
            if (data.status === 'ok' && data.agents) {
                // LIMIT TO 7
                const limitedAgents = data.agents.slice(0, 7);
                limitedAgents.forEach(agent => {
                    // Add random interests for matching
                    agent.interests = generateRandomInterests();
                    createAgentBlob(agent.id, agent.name, false, agent);
                });
            }
            // Start animation and mingle after agents loaded
            animateAgents();
            startMingleLoop();
        })
        .catch(err => {
            console.error("Failed to fetch hall agents", err);
            animateAgents();
            startMingleLoop();
        });
}

function generateRandomInterests() {
    const allInterests = ['hiking', 'coffee', 'tea', 'reading', 'travel', 'music', 'movies', 'cooking', 'fitness', 'art'];
    const count = 2 + Math.floor(Math.random() * 3);
    const shuffled = allInterests.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function createAgentBlob(id, name, isMe, data = null) {
    if (!hallContainer) return;
    
    const blob = document.createElement('div');
    blob.className = `agent-blob ${isMe ? 'me' : 'other'}`;
    blob.id = `agent-${id}`;
    blob.dataset.agentId = id;
    
    // Initial Position - Centered with spread
    const containerWidth = hallContainer.offsetWidth || 600;
    const containerHeight = hallContainer.offsetHeight || 400;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const spreadX = containerWidth * 0.35; // Spread out more for 10 agents
    const spreadY = containerHeight * 0.35;
    
    const x = centerX + (Math.random() - 0.5) * 2 * spreadX - 27;
    const y = centerY + (Math.random() - 0.5) * 2 * spreadY - 27;
    
    blob.style.left = '0px';
    blob.style.top = '0px';
    blob.style.transform = `translate(${x}px, ${y}px)`;
    
    // Movement State
    const angle = Math.random() * Math.PI * 2;
    const speed = isMe ? 0.15 : 0.12;
    
    blob.movement = {
        pos: { x: x, y: y },
        vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        acc: { x: 0, y: 0 },
        wanderAngle: Math.random() * Math.PI * 2,
        noiseOffset: Math.random() * 1000,
        // Waypoint Logic
        target: null, // {x, y}
        idleTimer: 0
    };
    
    blob.agentData = data || { id: id, name: name, interests: [] };

    // Content / avatar
    if (isMe) {
        // Me: use initial-based avatar
        const initial = name ? name[0].toUpperCase() : 'M';
        const span = document.createElement('span');
        span.className = 'agent-initial';
        span.textContent = initial;
        blob.appendChild(span);
        const hue = hashStringToHue(id || name || 'me');
        blob.style.background = `linear-gradient(135deg, hsl(${hue},80%,85%), hsl(${(hue + 40) % 360},80%,70%))`;
    } else {
        // Check if avatar exists and is valid (not empty, not default.png)
        const hasValidAvatar = data && data.avatar && 
                               data.avatar.trim() !== '' && 
                               data.avatar !== 'default.png' &&
                               !data.avatar.startsWith('http'); // Skip external URLs for now
        
        if (hasValidAvatar) {
            // Real image avatar - but also set up fallback if image fails to load
            const img = new Image();
            img.onerror = () => {
                // Image failed to load, fallback to colored initial
                blob.style.backgroundImage = '';
                const initial = name ? name[0].toUpperCase() : '?';
                const span = document.createElement('span');
                span.className = 'agent-initial';
                span.textContent = initial;
                blob.innerHTML = '';
                blob.appendChild(span);
                const hue = hashStringToHue(id || name || 'agent');
                blob.style.background = `linear-gradient(135deg, hsl(${hue},80%,85%), hsl(${(hue + 40) % 360},80%,70%))`;
            };
            img.onload = () => {
                // Image loaded successfully
                blob.style.backgroundImage = `url('/static/avatars/${data.avatar}')`;
                blob.style.backgroundSize = 'cover';
                blob.style.backgroundPosition = 'center';
            };
            img.src = `/static/avatars/${data.avatar}`;
            // Set initial state (will be updated by onload/onerror)
            blob.style.backgroundImage = `url('/static/avatars/${data.avatar}')`;
            blob.style.backgroundSize = 'cover';
            blob.style.backgroundPosition = 'center';
            blob.innerHTML = '';
        } else {
            // No valid image → colored initial circle
            const initial = name ? name[0].toUpperCase() : '?';
            const span = document.createElement('span');
            span.className = 'agent-initial';
            span.textContent = initial;
            blob.appendChild(span);
            const hue = hashStringToHue(id || name || 'agent');
            blob.style.background = `linear-gradient(135deg, hsl(${hue},80%,85%), hsl(${(hue + 40) % 360},80%,70%))`;
        }
        blob.dataset.info = JSON.stringify(data);
    }
    
    // Name Tag
    const nameTag = document.createElement('div');
    nameTag.className = 'agent-name-tag';
    nameTag.textContent = name;
    blob.appendChild(nameTag);
    
    // Initialize relationships
    relationships[id] = {};
    
    hallContainer.appendChild(blob);
    agents.push(blob);
    
    console.log(`Created agent: ${name}`);
}

// ============================================
// MINGLE SYSTEM - Agents Talk to Each Other
// ============================================

function startMingleLoop() {
    setInterval(() => {
        if (isPaused || agents.length < 2) return;
        triggerRandomConversation();
    }, MINGLE_INTERVAL);
}

function triggerRandomConversation() {
    // Pick a random agent to speak
    const speakerIdx = Math.floor(Math.random() * agents.length);
    const speaker = agents[speakerIdx];
    
    if (!speaker || !speaker.agentData) return;
    
    // Pick a random conversation starter
    const speech = CONVERSATION_STARTERS[Math.floor(Math.random() * CONVERSATION_STARTERS.length)];
    
    // Show speech bubble
    showSpeechBubble(speaker, speech);
    
    // Find nearby agents to respond
    setTimeout(() => {
        respondToSpeaker(speaker, speech);
    }, 1500);
}

function showSpeechBubble(agent, text, isResponse = false) {
    if (!agent) return;
    
    // Remove existing bubble if any
    const existingBubble = agent.querySelector('.speech-bubble');
    if (existingBubble) existingBubble.remove();
    
    const bubble = document.createElement('div');
    bubble.className = `speech-bubble ${isResponse ? 'response' : 'starter'}`;
    bubble.textContent = text;
    agent.appendChild(bubble);
    
    // Animate in
    setTimeout(() => bubble.classList.add('show'), 50);
    
    // Remove after duration
    setTimeout(() => {
        bubble.classList.remove('show');
        setTimeout(() => bubble.remove(), 300);
    }, SPEECH_DURATION);
}

function respondToSpeaker(speaker, speechText) {
    const speakerId = speaker.dataset.agentId;
    const speakerPos = speaker.movement.pos;
    
    // Find agents within hearing range
    agents.forEach(listener => {
        if (listener === speaker) return;
        if (!listener.movement) return;
        
        const listenerId = listener.dataset.agentId;
        const listenerPos = listener.movement.pos;
        
        // Calculate distance
        const dx = speakerPos.x - listenerPos.x;
        const dy = speakerPos.y - listenerPos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Only respond if close enough (within 250px)
        if (dist < 250) {
            // Determine response based on "compatibility"
            const compatibility = calculateCompatibility(speaker, listener, speechText);
            
            let response;
            let relationshipChange;
            
            if (compatibility > 0.6) {
                response = POSITIVE_RESPONSES[Math.floor(Math.random() * POSITIVE_RESPONSES.length)];
                relationshipChange = 0.3;
            } else if (compatibility > 0.3) {
                response = NEUTRAL_RESPONSES[Math.floor(Math.random() * NEUTRAL_RESPONSES.length)];
                relationshipChange = 0;
            } else {
                response = NEGATIVE_RESPONSES[Math.floor(Math.random() * NEGATIVE_RESPONSES.length)];
                relationshipChange = -0.2;
            }
            
            // Show response with delay
            setTimeout(() => {
                showSpeechBubble(listener, response, true);
            }, Math.random() * 800);
            
            // Update relationship scores
            updateRelationship(speakerId, listenerId, relationshipChange);
            updateRelationship(listenerId, speakerId, relationshipChange);
        }
    });
}

function calculateCompatibility(speaker, listener, speechText) {
    // Simple keyword matching for demo
    // In real app, this could use embeddings or LLM
    
    const speakerInterests = speaker.agentData?.interests || [];
    const listenerInterests = listener.agentData?.interests || [];
    
    // Check for shared interests
    const shared = speakerInterests.filter(i => listenerInterests.includes(i));
    
    // Check if speech contains listener's interests
    const speechLower = speechText.toLowerCase();
    const relevantToListener = listenerInterests.some(interest => 
        speechLower.includes(interest.toLowerCase())
    );
    
    let score = 0.4; // Base compatibility
    score += shared.length * 0.15;
    if (relevantToListener) score += 0.25;
    
    // Add some randomness
    score += (Math.random() - 0.5) * 0.3;
    
    return Math.max(0, Math.min(1, score));
}

function updateRelationship(fromId, toId, change) {
    if (!relationships[fromId]) relationships[fromId] = {};
    if (!relationships[fromId][toId]) relationships[fromId][toId] = 0;
    
    relationships[fromId][toId] += change;
    
    // Clamp between -1 and 1
    relationships[fromId][toId] = Math.max(-1, Math.min(1, relationships[fromId][toId]));
}

// ============================================
// ANIMATION LOOP with Purposeful Waypoints
// ============================================

function animateAgents() {
    if (isPaused || !hallContainer) return;
    
    const width = hallContainer.offsetWidth || 600;
    const height = hallContainer.offsetHeight || 400;
    
    agents.forEach(agent => {
        if (!agent.movement) return;
        
        const m = agent.movement;
        const agentId = agent.dataset.agentId;
        
        // --- Waypoint & Idle Logic ---
        
        // If idle, countdown
        if (m.idleTimer > 0) {
            m.idleTimer--;
            // While idle, velocity decays rapidly to 0
            m.vel.x *= 0.9;
            m.vel.y *= 0.9;
            
            // If finished idle, pick new target
            if (m.idleTimer <= 0) {
                pickNewTarget(m, width, height);
            }
        } 
        else {
            // If no target, pick one
            if (!m.target) {
                pickNewTarget(m, width, height);
            }
            
            // Check distance to target
            const dx = m.target.x - m.pos.x;
            const dy = m.target.y - m.pos.y;
            const distToTarget = Math.sqrt(dx*dx + dy*dy);
            
            if (distToTarget < ARRIVAL_RADIUS) {
                // Arrived! Start idle
                m.target = null;
                m.idleTimer = IDLE_TIME_MIN + Math.random() * (IDLE_TIME_MAX - IDLE_TIME_MIN);
            } else {
                // Seek target
                // Steer towards target
                const desiredX = (dx / distToTarget) * MAX_SPEED;
                const desiredY = (dy / distToTarget) * MAX_SPEED;
                
                const steerX = (desiredX - m.vel.x) * 0.05; // Steer strength
                const steerY = (desiredY - m.vel.y) * 0.05;
                
                applyForce(m, {x: steerX, y: steerY}, 1.0);
            }
        }
        
        // --- Overlay Organic Wander & Social Forces ---
        
        // 1. Smooth Wander (reduced influence when seeking target)
        m.noiseOffset += 0.006;
        const noise = Math.sin(m.noiseOffset) * Math.cos(m.noiseOffset * 0.7);
        m.wanderAngle += noise * 0.04;
        
        const wanderX = Math.cos(m.wanderAngle) * 0.2;
        const wanderY = Math.sin(m.wanderAngle) * 0.2;
        
        // 2. Separation Force (always active to avoid clumps)
        const sepForce = calculateSeparation(agent);
        
        // 3. Boundary Force (Safety net)
        const boundForce = calculateBoundaries(agent, width, height);
        
        // 4. Social Force (Attraction overrides wandering)
        const socialForce = calculateSocialForces(agent, agentId);
        
        // Apply Forces
        // If seeking target, wander less. If idle, wander barely (drift).
        const wanderWeight = (m.idleTimer > 0) ? 0.005 : 0.01; 
        
        applyForce(m, {x: wanderX, y: wanderY}, wanderWeight);
        applyForce(m, sepForce, 0.06);
        applyForce(m, boundForce, 0.15);
        
        // Social force is strong - if attracted, it pulls them off their waypoint path
        if (Math.abs(socialForce.x) > 0 || Math.abs(socialForce.y) > 0) {
             applyForce(m, socialForce, 0.05);
             // If strongly attracted, maybe cancel idle?
             if (m.idleTimer > 0 && Math.random() < 0.01) m.idleTimer = 0;
        }
        
        // Update Physics
        m.vel.x += m.acc.x;
        m.vel.y += m.acc.y;
        
        // Limit Speed
        const speed = Math.sqrt(m.vel.x**2 + m.vel.y**2);
        if (speed > MAX_SPEED) {
            m.vel.x = (m.vel.x / speed) * MAX_SPEED;
            m.vel.y = (m.vel.y / speed) * MAX_SPEED;
        }
        
        m.pos.x += m.vel.x;
        m.pos.y += m.vel.y;
        
        // Reset Acc
        m.acc.x = 0;
        m.acc.y = 0;
        
        // Render
        agent.style.transform = `translate(${m.pos.x}px, ${m.pos.y}px)`;
        agent.dataset.x = m.pos.x;
        agent.dataset.y = m.pos.y;
    });
    
    checkEncounters();
    
    animationFrameId = requestAnimationFrame(animateAgents);
}

function pickNewTarget(m, width, height) {
    // Pick a random point within margins
    const margin = BOUNDARY_MARGIN + 20;
    m.target = {
        x: margin + Math.random() * (width - 2 * margin),
        y: margin + Math.random() * (height - 2 * margin)
    };
}

function calculateSocialForces(agent, agentId) {
    const force = { x: 0, y: 0 };
    const myRelations = relationships[agentId] || {};
    
    agents.forEach(other => {
        if (other === agent || !other.movement) return;
        
        const otherId = other.dataset.agentId;
        const score = myRelations[otherId] || 0;
        
        if (Math.abs(score) < 0.1) return; // No significant relationship
        
        const dx = other.movement.pos.x - agent.movement.pos.x;
        const dy = other.movement.pos.y - agent.movement.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > ATTRACTION_RADIUS || dist < 1) return;
        
        // Normalize direction
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Attraction if positive score, repulsion if negative
        // Strength decreases with distance
        const strength = score * ATTRACTION_STRENGTH * (1 - dist / ATTRACTION_RADIUS);
        
        force.x += nx * strength;
        force.y += ny * strength;
    });
    
    return force;
}

function applyForce(m, force, weight) {
    m.acc.x += force.x * weight;
    m.acc.y += force.y * weight;
}

function calculateSeparation(current) {
    const steer = { x: 0, y: 0 };
    let count = 0;
    
    agents.forEach(other => {
        if (other === current || !other.movement) return;
        
        const dx = current.movement.pos.x - other.movement.pos.x;
        const dy = current.movement.pos.y - other.movement.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Minimum separation to prevent overlap
        if (dist > 0 && dist < SEPARATION_RADIUS) {
            const strength = 1.0 / (dist + 10);
            steer.x += dx * strength;
            steer.y += dy * strength;
            count++;
        }
    });
    
    if (count > 0) {
        steer.x /= count;
        steer.y /= count;
    }
    return steer;
}

function calculateBoundaries(agent, width, height) {
    const m = agent.movement;
    const steer = { x: 0, y: 0 };
    const padding = BOUNDARY_MARGIN;
    
    if (m.pos.x < padding) steer.x = MAX_SPEED * 1.5;
    else if (m.pos.x > width - padding) steer.x = -MAX_SPEED * 1.5;
    
    if (m.pos.y < padding) steer.y = MAX_SPEED * 1.5;
    else if (m.pos.y > height - padding) steer.y = -MAX_SPEED * 1.5;
    
    return steer;
}

// ============================================
// ENCOUNTER / SPARK SYSTEM (TOAST VERSION)
// ============================================

function checkEncounters() {
    const now = Date.now();
    if (now - lastEncounterTime < ENCOUNTER_COOLDOWN) return;
    
    const myAgent = agents.find(a => a.classList && a.classList.contains('me'));
    if (!myAgent || !myAgent.movement) return;
    
    let closest = null;
    let minDist = 10000;
    let bestScore = -999; 
    
    agents.forEach(other => {
        if (other === myAgent || !other.movement || !other.dataset.info) return;
        
        const otherId = other.dataset.agentId;
        // Avoid sparking with someone we already have a toast for
        if (document.getElementById(`toast-${otherId}`)) return;
        
        const attraction = relationships['me']?.[otherId] || 0;
        
        const dx = myAgent.movement.pos.x - other.movement.pos.x;
        const dy = myAgent.movement.pos.y - other.movement.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 90) {
            const score = (100 - dist) + (attraction * 50);
            if (score > bestScore) {
                bestScore = score;
                closest = other;
                minDist = dist;
            }
        }
    });
    
    if (closest) {
        const attraction = relationships['me']?.[closest.dataset.agentId] || 0;
        if (attraction < -0.3 && Math.random() < 0.2) return;
        
        triggerSpark(closest);
    }
}

function triggerSpark(targetBlob) {
    lastEncounterTime = Date.now();
    
    let data;
    try {
        data = JSON.parse(targetBlob.dataset.info);
    } catch (e) {
        console.error('Failed to parse agent info', e);
        return;
    }
    
    // Highlight the agent visually
    targetBlob.classList.add('spark-active');
    
    createSparkToast(data, targetBlob);
}

function createSparkToast(agentData, targetBlob) {
    const container = document.getElementById('spark-container');
    if (!container) return;

    // Only show ONE active spark toast at a time – clear previous
    Array.from(container.querySelectorAll('.spark-card')).forEach(card => card.remove());
        
    const toastId = `toast-${agentData.id}`;
    
    const toast = document.createElement('div');
    toast.className = 'spark-card';
    toast.id = toastId;
    
    // Background image logic for avatar div
    let avatarUrl = '';
    if (targetBlob && targetBlob.style.backgroundImage) {
        // extract url(...)
        avatarUrl = targetBlob.style.backgroundImage; 
    }
    
    toast.innerHTML = `
        <div class="spark-header-row">
            <div class="spark-badge-mini">✨ Spark!</div>
            <button class="btn-close-mini" onclick="closeToast('${toastId}', '${agentData.id}')">&times;</button>
        </div>
        <div class="spark-body-row">
            <div class="spark-avatar-mini" style="background-image: ${avatarUrl};"></div>
            <div class="spark-info">
                <div class="spark-name">${agentData.name}</div>
                <div class="spark-preview" id="preview-${toastId}">
                    <span class="pulsing-dot" style="display:inline-block; width:6px; height:6px; margin-right:4px;"></span>
                    Interacting...
                </div>
            </div>
        </div>
        <div class="spark-actions-row">
            <button class="btn-toast-pass" onclick="closeToast('${toastId}', '${agentData.id}')">Pass</button>
            <button class="btn-toast-dive" onclick="startDeepDive('${agentData.id}')">
                Deep Dive
            </button>
        </div>
    `;
    
    toast.dataset.agentData = JSON.stringify(agentData);
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });
    
    fetch('/api/hall/check_interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: agentData.id })
    })
    .then(res => res.json())
    .then(res => {
        const previewEl = document.getElementById(`preview-${toastId}`);
        if (previewEl) {
            if (res.status === 'ok' && res.interested && res.dialogue) {
                const lastLine = res.dialogue[res.dialogue.length - 1];
                previewEl.innerHTML = `"${lastLine.text}"`;
                // Store dialogue for deep dive
                toast.dataset.dialogue = JSON.stringify(res.dialogue);
            } else {
                previewEl.innerHTML = "Just passing by...";
                setTimeout(() => closeToast(toastId, agentData.id), 3000);
            }
        }
    })
    .catch(err => {
        console.error("Interaction failed", err);
        const previewEl = document.getElementById(`preview-${toastId}`);
        if(previewEl) previewEl.innerHTML = "Connection glitch...";
    });
}

window.closeToast = function(id, agentId) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 400);
    }
    // Remove highlight
    if (agentId) {
        const agentBlob = document.getElementById(`agent-${agentId}`);
        if (agentBlob) agentBlob.classList.remove('spark-active');
    }
};

// Re-introduced for Preview Modal
window.closePreviewModal = function() {
    const modal = document.getElementById('preview-modal');
    if (modal) modal.classList.remove('show');
};

window.startDeepDive = function(agentId) {
    const toast = document.getElementById(`toast-${agentId}`);
    let partnerData = null;
    let sparkDialogue = [];
    
    // Extract data from Toast
    if (toast) {
        if (toast.dataset.agentData) {
            try { partnerData = JSON.parse(toast.dataset.agentData); } catch(e) {}
        }
        if (toast.dataset.dialogue) {
            try { sparkDialogue = JSON.parse(toast.dataset.dialogue); } catch(e) {}
        }
    }
    
    // Fallback: try to find in agents list
    if (!partnerData) {
        const agentBlob = document.getElementById(`agent-${agentId}`);
        if (agentBlob && agentBlob.dataset.info) {
            partnerData = JSON.parse(agentBlob.dataset.info);
        }
    }
    
    if (!partnerData) {
        console.error("Could not find agent data for deep dive");
        return;
    }
    
    // Close the toast first
    if (toast) window.closeToast(`toast-${agentId}`, agentId);
    
    // Open Preview Modal instead of jumping
    openPreviewModal(partnerData, sparkDialogue);
};

function openPreviewModal(partnerData, dialogue) {
    const modal = document.getElementById('preview-modal');
    const meAvatar = document.getElementById('preview-me');
    const otherAvatar = document.getElementById('preview-other');
    const dialogueBox = document.getElementById('preview-dialogue');
    const btnConfirm = document.getElementById('btn-confirm-dive');
    
    if (!modal) return;
    
    // Set Avatars (Simple colors/text for now, could be images)
    meAvatar.style.backgroundColor = '#e2e8f0';
    meAvatar.textContent = '👤';
    meAvatar.style.display = 'flex'; 
    meAvatar.style.alignItems = 'center'; 
    meAvatar.style.justifyContent = 'center';
    
    if (partnerData.avatar) {
        otherAvatar.style.backgroundImage = `url('/static/avatars/${partnerData.avatar}')`;
        otherAvatar.textContent = '';
    } else {
        otherAvatar.style.backgroundColor = '#e2e8f0';
        otherAvatar.textContent = partnerData.name ? partnerData.name[0] : '?';
        otherAvatar.style.display = 'flex'; 
        otherAvatar.style.alignItems = 'center'; 
        otherAvatar.style.justifyContent = 'center';
    }
    
    // Render Dialogue with Typing Effect
    dialogueBox.innerHTML = '';
    if (dialogue && dialogue.length > 0) {
        let i = 0;
        function typeNextLine() {
            if (i >= dialogue.length) return;
            const line = dialogue[i];
            
            const div = document.createElement('div');
            div.className = 'dialogue-line';
            div.style.opacity = '0';
            div.style.transform = 'translateY(10px)';
            div.style.transition = 'all 0.3s ease';
            
            const speakerName = line.speaker === 'Me' ? 'You' : partnerData.name;
            div.innerHTML = `<strong>${speakerName}:</strong> ${line.text}`;
            
            dialogueBox.appendChild(div);
            
            // Trigger reflow for transition
            void div.offsetWidth;
            
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
            
            // Auto scroll to bottom
            dialogueBox.scrollTop = dialogueBox.scrollHeight;
            
            i++;
            setTimeout(typeNextLine, 800); // Delay between lines
        }
        
        // Start typing after modal opens
        setTimeout(typeNextLine, 300);
    } else {
        dialogueBox.innerHTML = '<p style="text-align:center; color:#718096;">(No conversation history yet)</p>';
    }
    
    // Bind Confirm Button
    btnConfirm.onclick = () => goToSandbox(partnerData, dialogue);
    
    modal.classList.add('show');
}

function goToSandbox(partnerData, sparkDialogue) {
    const partnerForSandbox = {
        nickname: partnerData.name,
        age: 25,
        gender: partnerData.gender,
        occupation: "Explorer",
        interests: partnerData.bio,
        bio: partnerData.bio
    };
    
    sessionStorage.setItem('home_scenario', 'spark_match');
    sessionStorage.setItem('selected_partner_agent', JSON.stringify(partnerForSandbox));
    // Save the small talk
    sessionStorage.setItem('spark_dialogue', JSON.stringify(sparkDialogue));
    
    window.location.href = '/sandbox';
}

// Remove old functions to avoid confusion
// displayDialogue, closeSparkModal -> Removed

