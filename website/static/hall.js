// Agent Hall Logic - "Love First, Know Later"

const hallContainer = document.getElementById('agent-hall-container');
const myAgentId = 'me';
let agents = [];
let isPaused = false;
let animationFrameId;
let lastEncounterTime = 0;
const ENCOUNTER_COOLDOWN = 5000; // 5 seconds between potential matches

// Mock Agent Data (will be replaced by API later)
const MOCK_AGENTS = [
    { id: 'u1', name: 'Elena', avatar: '5bc44f2c589383ee6089a4e780bd.jpeg', gender: 'female', bio: 'Loves jazz and coffee.' },
    { id: 'u2', name: 'Marcus', avatar: 'be4a4df66e47a38238e790be206d5c4.jpg', gender: 'male', bio: 'Chef and traveler.' },
    { id: 'u3', name: 'Luna', avatar: 'd0a31e54-9d19-4c41-82dc-5bce0eb2eac9.png', gender: 'female', bio: 'Artist and dreamer.' },
    { id: 'u4', name: 'Alex', avatar: 'ad02ffb259fd1c3255f94fa92255c1c.jpg', gender: 'male', bio: 'Tech enthusiast.' },
    { id: 'u5', name: 'Sophia', avatar: '990838cfdfef5631d48974231405ce4.jpg', gender: 'female', bio: 'Bookworm.' }
];

document.addEventListener('DOMContentLoaded', () => {
    initHall();
});

function initHall() {
    if (!hallContainer) return;
    
    // 1. Create My Agent
    createAgentBlob('me', 'Me', true);
    
    // 2. Fetch and Create Others (API)
    fetch('/api/hall/agents')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                // Limit to 6 agents for cleaner look
                const limitedAgents = data.agents.slice(0, 6);
                limitedAgents.forEach(agent => {
                    createAgentBlob(agent.id, agent.name, false, agent);
                });
            }
        })
        .catch(err => console.error("Failed to fetch hall agents", err));
    
    // 3. Start Animation Loop
    animateAgents();
}

function createAgentBlob(id, name, isMe, data = null) {
    const blob = document.createElement('div');
    blob.className = `agent-blob ${isMe ? 'me' : 'other'}`;
    blob.id = `agent-${id}`;
    
    // Initial Position - Centered with spread
    const centerX = hallContainer.offsetWidth / 2;
    const centerY = hallContainer.offsetHeight / 2;
    // Spread within 60% of container to ensure they are visible
    const spreadX = hallContainer.offsetWidth * 0.3;
    const spreadY = hallContainer.offsetHeight * 0.3;
    
    const x = centerX + (Math.random() - 0.5) * 2 * spreadX - 30; // -30 for half blob size
    const y = centerY + (Math.random() - 0.5) * 2 * spreadY - 30;
    
    // Use transform for positioning from the start
    blob.style.left = '0px';
    blob.style.top = '0px';
    blob.style.transform = `translate(${x}px, ${y}px)`;
    
    // Velocity vector (random direction)
    const angle = Math.random() * Math.PI * 2;
    const speed = isMe ? 0.8 : 0.5; // Me moves slightly faster
    blob.dataset.vx = Math.cos(angle) * speed;
    blob.dataset.vy = Math.sin(angle) * speed;
    blob.dataset.x = x;
    blob.dataset.y = y;
    
    // Content
    if (isMe) {
        blob.innerHTML = '👤';
    } else {
        blob.innerHTML = '🤖'; // Placeholder, maybe image later
        blob.style.backgroundImage = `url('/static/avatars/${data.avatar}')`;
        blob.style.backgroundSize = 'cover';
        blob.dataset.info = JSON.stringify(data);
    }
    
    // Name Tag
    const nameTag = document.createElement('div');
    nameTag.className = 'agent-name-tag';
    nameTag.textContent = name;
    blob.appendChild(nameTag);
    
    hallContainer.appendChild(blob);
    agents.push(blob);
}

function animateAgents() {
    if (isPaused) return;
    
    const width = hallContainer.offsetWidth - 60;
    const height = hallContainer.offsetHeight - 60;
    
    agents.forEach(blob => {
        let x = parseFloat(blob.dataset.x);
        let y = parseFloat(blob.dataset.y);
        let vx = parseFloat(blob.dataset.vx);
        let vy = parseFloat(blob.dataset.vy);
        
        // Gentle Center Gravity
        // Pull agents slightly towards the center to keep them in view
        const centerX = width / 2;
        const centerY = height / 2;
        const dx = centerX - x;
        const dy = centerY - y;
        
        vx += dx * 0.0002;
        vy += dy * 0.0002;
        
        // Move
        x += vx;
        y += vy;
        
        // Soft Boundaries (Bounce with damping)
        if (x <= 20 || x >= width - 20) {
            vx *= -0.8; // Dampen velocity on wall hit
            x = Math.max(20, Math.min(x, width - 20));
        }
        if (y <= 20 || y >= height - 20) {
            vy *= -0.8;
            y = Math.max(20, Math.min(y, height - 20));
        }
        
        // Update State
        blob.dataset.x = x;
        blob.dataset.y = y;
        blob.dataset.vx = vx;
        blob.dataset.vy = vy;
        
        // Apply Style
        blob.style.transform = `translate(${x}px, ${y}px)`;
        // Keep left/top at 0 in CSS to strictly use transform for positioning if desired, 
        // but our init uses left/top. Let's zero them out after first frame or just ignore them.
        // Actually, mixing left/top and transform is bad. 
        // Let's reset left/top to 0 in createAgentBlob? No, too invasive.
        // We simply rely on transform overriding the initial layout position relative to 0,0.
        // To do this cleanly: we should set left:0, top:0 in CSS and ONLY use transform.
        // But for now, let's just update left/top to match x/y to be safe with existing CSS.
        blob.style.left = `0px`; 
        blob.style.top = `0px`;
    });
    
    checkEncounters();
    
    animationFrameId = requestAnimationFrame(animateAgents);
}

function checkEncounters() {
    const now = Date.now();
    if (now - lastEncounterTime < ENCOUNTER_COOLDOWN) return;
    
    const myAgent = document.getElementById('agent-me');
    if (!myAgent) return;
    
    const myX = parseFloat(myAgent.dataset.x);
    const myY = parseFloat(myAgent.dataset.y);
    
    // Find closest agent
    let closest = null;
    let minDist = 10000; // huge number
    
    agents.forEach(other => {
        if (other.id === 'agent-me') return;
        
        const ox = parseFloat(other.dataset.x);
        const oy = parseFloat(other.dataset.y);
        const dx = myX - ox;
        const dy = myY - oy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 100) { // 100px proximity
            if (dist < minDist) {
                minDist = dist;
                closest = other;
            }
        }
    });
    
    // If very close, trigger spark
    if (closest && minDist < 80) {
        if (Math.random() < 0.05) { // 5% chance per frame when close? No, too frequent.
             // Handled by Cooldown. Always trigger if cooldown is passed and close enough.
             triggerSpark(closest);
        }
    }
}

let currentPartnerData = null;

function triggerSpark(targetBlob) {
    isPaused = true;
    cancelAnimationFrame(animationFrameId);
    lastEncounterTime = Date.now();
    
    const data = JSON.parse(targetBlob.dataset.info);
    currentPartnerData = data;
    
    // Show Modal
    const modal = document.getElementById('spark-modal');
    const dialogueBox = document.getElementById('spark-dialogue');
    const otherAvatar = document.getElementById('spark-other');
    
    // Set Avatar
    if (targetBlob.style.backgroundImage) {
        otherAvatar.style.backgroundImage = targetBlob.style.backgroundImage;
    } else {
         // Fallback if bot has no image url or uses color/initials
         otherAvatar.style.backgroundColor = '#eee';
         otherAvatar.innerText = data.name[0];
    }
    
    dialogueBox.innerHTML = '<div class="loading-text">✨ Agents interacting...</div>';
    
    modal.classList.add('show');
    
    // Call API for Dialogue
    fetch('/api/hall/check_interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_id: data.id })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === 'ok' && res.interested) {
            displayDialogue(res.dialogue, data.name);
        } else {
            dialogueBox.innerHTML = '<div class="loading-text">No spark this time. Agents moved on.</div>';
            setTimeout(closeSparkModal, 2000);
        }
    })
    .catch(err => {
        console.error("Interaction failed", err);
        dialogueBox.innerHTML = '<div class="loading-text">Connection glitch...</div>';
        setTimeout(closeSparkModal, 2000);
    });
}

function displayDialogue(dialogue, partnerName) {
    const dialogueBox = document.getElementById('spark-dialogue');
    dialogueBox.innerHTML = '';
    
    let i = 0;
    function typeLine() {
        if (i >= dialogue.length) return;
        const line = dialogue[i];
        const speaker = line.speaker === 'Partner' ? partnerName : 'Me';
        const div = document.createElement('div');
        div.className = 'dialogue-line';
        div.innerHTML = `<strong>${speaker}:</strong> ${line.text}`;
        div.style.opacity = 0;
        dialogueBox.appendChild(div);
        
        // Fade in
        setTimeout(() => { div.style.opacity = 1; }, 100);
        
        i++;
        setTimeout(typeLine, 1500);
    }
    typeLine();
}

function closeSparkModal() {
    const modal = document.getElementById('spark-modal');
    modal.classList.remove('show');
    isPaused = false;
    animateAgents();
    
    // Add extra cooldown to prevent immediate re-trigger
    lastEncounterTime = Date.now() + 2000; 
}

function startDeepDive() {
    if (!currentPartnerData) return;
    
    // Store partner data for Sandbox
    const partnerForSandbox = {
        nickname: currentPartnerData.name,
        age: 25, // Mock
        gender: currentPartnerData.gender,
        occupation: "Explorer",
        interests: currentPartnerData.bio,
        bio: currentPartnerData.bio
    };
    
    sessionStorage.setItem('home_scenario', 'spark_match'); // Signal to Sandbox
    sessionStorage.setItem('selected_partner_agent', JSON.stringify(partnerForSandbox));
    
    window.location.href = '/sandbox';
}

