// Discovery - Real Users + Simulated Users

// SVG Avatar Helper
function getAvatarSVG(gender) {
    const svgMale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><defs><linearGradient id='gM' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#a1c4fd'/><stop offset='100%' stop-color='#c2e9fb'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gM)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    const svgFemale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><defs><linearGradient id='gF' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#fdcbf1'/><stop offset='100%' stop-color='#e6dee9'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gF)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    return gender === 'male' ? svgMale : svgFemale;
}

// Simulated Real Users (For Demo)
const SIMULATED_USERS = [
    {
        id: 'user_001',
        name: 'Sarah',
        gender: 'female',
        age: 26,
        role: 'UX Designer',
        bio: "I love creating beautiful experiences. Looking for someone who appreciates the little details in life.",
        echoes: {
            default: "Hey there! What brings you here?",
            love: "I believe in meaningful connections.",
            sad: "Sometimes we all need someone to talk to.",
            fun: "Always up for trying new things!"
        },
        pos: { top: '25%', left: '20%' }
    },
    {
        id: 'user_002',
        name: 'James',
        gender: 'male',
        age: 28,
        role: 'Software Engineer',
        bio: "Building apps by day, playing guitar by night. Looking for someone who enjoys deep conversations.",
        echoes: {
            default: "Nice to meet you!",
            love: "Looking for something real.",
            sad: "Music helps me through tough times.",
            fun: "Let's grab coffee sometime!"
        },
        pos: { top: '60%', left: '75%' }
    },
    {
        id: 'user_003',
        name: 'Emily',
        gender: 'female',
        age: 24,
        role: 'Graduate Student',
        bio: "Studying psychology, fascinated by human connections. Love hiking and reading.",
        echoes: {
            default: "Hi! I'm curious about you.",
            love: "I believe every person has a story.",
            sad: "It's okay to not be okay sometimes.",
            fun: "Mountains or beach? I choose mountains!"
        },
        pos: { top: '35%', left: '70%' }
    },
    {
        id: 'user_004',
        name: 'Michael',
        gender: 'male',
        age: 30,
        role: 'Photographer',
        bio: "Capturing moments that matter. Travel enthusiast. Looking for a partner in adventure.",
        echoes: {
            default: "The light is perfect right now.",
            love: "I want to capture our story.",
            sad: "Every photo tells a story.",
            fun: "Pack your bags, let's go somewhere!"
        },
        pos: { top: '65%', left: '25%' }
    }
];

let ALL_AGENTS = [...SIMULATED_USERS];
let currentAgent = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Try to load real users from database
    try {
        const res = await fetch('/get_user_info');
        if (res.ok) {
            const myData = await res.json();
            const myId = myData._id;

            const listRes = await fetch('/users/get-list', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ user_Id: myId })
            });
            
            if (listRes.ok) {
                const users = await listRes.json();
                const realUsers = users.map((u, idx) => ({
                    id: u.id,
                    name: u.name || 'User',
                    gender: u.gender || 'unknown',
                    age: u.age || 25,
                    role: u.occupation || 'Member',
                    bio: u.bio || "A real person looking for connection.",
                    echoes: {
                        default: `Hi, I'm ${u.name || 'here'}!`,
                        love: "Looking for something meaningful.",
                        sad: "We all have our moments.",
                        fun: "Let's have some fun!"
                    },
                    pos: { 
                        top: `${20 + (idx % 3) * 25}%`, 
                        left: `${20 + (idx % 4) * 20}%` 
                    }
                }));
                
                // Mix real users with simulated
                ALL_AGENTS = [...realUsers, ...SIMULATED_USERS];
            }
        }
    } catch (e) {
        console.log("Using simulated users only", e);
    }
    
    // Setup input listener
    document.getElementById('soul-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startScanning();
    });
});

async function startScanning() {
    const input = document.getElementById('soul-input').value.toLowerCase();
    const container = document.querySelector('.radar-container');
    const field = document.getElementById('radar-field');
    const loading = document.getElementById('loading-pulse');
    
    // Start scanning animation
    container.classList.add('scanning');
    field.innerHTML = '';
    if (loading) loading.style.display = 'flex';
    
    // Simulate processing
    await new Promise(r => setTimeout(r, 1500));
    
    if (loading) loading.style.display = 'none';
    
    // Determine intent
    let intent = 'default';
    if (input.includes('love') || input.includes('date') || input.includes('relationship')) intent = 'love';
    if (input.includes('sad') || input.includes('lonely') || input.includes('down')) intent = 'sad';
    if (input.includes('fun') || input.includes('adventure') || input.includes('travel')) intent = 'fun';
    
    // Reveal agents
    ALL_AGENTS.forEach((agent, idx) => {
        setTimeout(() => {
            const blip = document.createElement('div');
            blip.className = 'radar-blip';
            blip.style.top = agent.pos.top;
            blip.style.left = agent.pos.left;
            blip.onclick = () => openModal(agent);
            
            const reply = agent.echoes[intent] || agent.echoes.default;
            
            blip.innerHTML = `
                <div class="blip-bubble">${reply}</div>
                <div class="blip-avatar">
                    ${getAvatarSVG(agent.gender)}
                </div>
            `;
            
            field.appendChild(blip);
            setTimeout(() => blip.classList.add('detected'), 50);
            
        }, idx * 350);
    });
    
    // Stop scanning after all revealed
    setTimeout(() => {
        container.classList.remove('scanning');
    }, ALL_AGENTS.length * 350 + 500);
}

function openModal(agent) {
    currentAgent = agent;
    const modal = document.getElementById('agent-modal');
    const body = document.getElementById('modal-body');
    
    body.innerHTML = `
        <div class="modal-avatar-large">${getAvatarSVG(agent.gender)}</div>
        <div class="modal-name">${agent.name}, ${agent.age}</div>
        <div class="modal-tagline">${agent.role}</div>
        <div class="modal-bio">"${agent.bio}"</div>
        <button class="btn-connect" onclick="startJourney()">Start Journey with ${agent.name}</button>
    `;
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('agent-modal').classList.remove('show');
}

function startJourney() {
    if (!currentAgent) return;
    
    // Save partner for journey
    localStorage.setItem('journey_partner', JSON.stringify({
        name: currentAgent.name,
        gender: currentAgent.gender,
        age: currentAgent.age,
        occupation: currentAgent.role,
        bio: currentAgent.bio,
        id: currentAgent.id
    }));
    
    window.location.href = '/journey?partner_id=' + currentAgent.id;
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('agent-modal');
    if (event.target == modal) closeModal();
}
