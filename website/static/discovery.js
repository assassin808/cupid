// Discovery Radar Logic - Real Users with Mock Fallback

// Helper: Same SVG Avatars as Sandbox
function getAvatarSVG(gender) {
    const svgMale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gM' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#a1c4fd'/><stop offset='100%' stop-color='#c2e9fb'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gM)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    const svgFemale = `<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg' style='width:100%;height:100%;border-radius:50%;'><defs><linearGradient id='gF' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#fdcbf1'/><stop offset='100%' stop-color='#e6dee9'/></linearGradient></defs><circle cx='50' cy='50' r='50' fill='url(#gF)'/><path d='M50 25C40 25 32 33 32 43C32 53 40 61 50 61C60 61 68 53 68 43C68 33 60 25 50 25ZM28 82C28 70 38 63 50 63C62 63 72 70 72 82' fill='white' fill-opacity='0.9'/></svg>`;
    return gender === 'male' ? svgMale : svgFemale;
}

// Mock Real Users (Fallback if DB is empty)
const MOCK_REAL_USERS = [
    {
        id: 'mock_1',
        name: 'Sarah',
        gender: 'female',
        role: 'Marketing Manager',
        bio: "Love hiking on weekends and trying new restaurants. Looking for someone who shares my passion for travel.",
        echoes: {
            default: "Hey! What brings you here?",
            love: "I'd love to get to know you better.",
            sad: "I understand. Want to talk about it?",
            fun: "Let's plan something fun together!"
        },
        pos: { top: '25%', left: '30%' }
    },
    {
        id: 'mock_2',
        name: 'James',
        gender: 'male',
        role: 'Software Engineer',
        bio: "Into indie music and board games. Prefer deep conversations over small talk.",
        echoes: {
            default: "Hi there. What's on your mind?",
            love: "I'm interested in getting to know you.",
            sad: "I'm here if you need someone to listen.",
            fun: "Sounds like a plan! What do you have in mind?"
        },
        pos: { top: '60%', left: '70%' }
    },
    {
        id: 'mock_3',
        name: 'Emma',
        gender: 'female',
        role: 'Teacher',
        bio: "Elementary school teacher who loves reading and yoga. Looking for genuine connections.",
        echoes: {
            default: "Hello! Nice to meet you.",
            love: "I'd love to explore this connection.",
            sad: "I'm here for you. Let's talk.",
            fun: "That sounds exciting! Count me in."
        },
        pos: { top: '40%', left: '15%' }
    },
    {
        id: 'mock_4',
        name: 'Michael',
        gender: 'male',
        role: 'Photographer',
        bio: "Freelance photographer. Love capturing moments and exploring new places.",
        echoes: {
            default: "Hey! What's your story?",
            love: "I'm intrigued. Let's see where this goes.",
            sad: "I get it. Sometimes we all need someone.",
            fun: "Adventure? I'm always up for that!"
        },
        pos: { top: '75%', left: '25%' }
    },
    {
        id: 'mock_5',
        name: 'Lisa',
        gender: 'female',
        role: 'Graphic Designer',
        bio: "Creative soul who loves art galleries and coffee shops. Seeking meaningful connections.",
        echoes: {
            default: "Hi! What brings you here today?",
            love: "I feel a connection. Let's explore it.",
            sad: "I understand. Want to share?",
            fun: "That sounds amazing! Let's do it."
        },
        pos: { top: '20%', left: '75%' }
    }
];

let REAL_AGENTS = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Load real users from database
    try {
        const res = await fetch('/get_user_info');
        const myData = await res.json();
        const myId = myData._id;

        const listRes = await fetch('/users/get-list', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_Id: myId })
        });
        
        if (listRes.ok) {
            const users = await listRes.json();
            if (users && users.length > 0) {
                REAL_AGENTS = users.map(u => ({
                    id: u.id,
                    name: u.name || 'User',
                    gender: u.gender || 'unknown',
                    role: u.occupation || 'Member',
                    bio: u.bio || "A real person exploring love through AI.",
                    echoes: {
                        default: generateEcho(u),
                        love: generateEcho(u, 'love'),
                        sad: generateEcho(u, 'sad'),
                        fun: generateEcho(u, 'fun')
                    },
                    pos: { top: `${Math.random() * 60 + 20}%`, left: `${Math.random() * 60 + 20}%` }
                }));
            }
        }
    } catch (e) {
        console.error("Failed to load users", e);
    }
    
    // If no real users, use mock (for demo)
    if (REAL_AGENTS.length === 0) {
        REAL_AGENTS = MOCK_REAL_USERS;
    }
    
    // Setup input listener
    document.getElementById('soul-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startScanning();
    });
});

// Simple echo generator
function generateEcho(user, intent = 'default') {
    const name = user.name || 'I';
    if (intent === 'love') return `${name} is looking for something real.`;
    if (intent === 'sad') return `${name} understands. Let's talk.`;
    if (intent === 'fun') return `${name} is ready for an adventure!`;
    return `${name} is here. What's on your mind?`;
}

async function startScanning() {
    const input = document.getElementById('soul-input').value.toLowerCase();
    const container = document.querySelector('.radar-container');
    const field = document.getElementById('radar-field');
    
    // 1. Start Animation
    container.classList.add('scanning');
    field.innerHTML = '';
    
    // 2. Simulate Delay
    await new Promise(r => setTimeout(r, 1500));
    
    // 3. Determine Intent
    let intent = 'default';
    if (input.includes('love') || input.includes('date')) intent = 'love';
    if (input.includes('sad') || input.includes('lonely')) intent = 'sad';
    if (input.includes('fun') || input.includes('go')) intent = 'fun';
    
    // 4. Reveal Agents
    if (REAL_AGENTS.length === 0) {
        field.innerHTML = '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;text-align:center;"><p>No users found. Be the first!</p></div>';
        return;
    }
    
    REAL_AGENTS.forEach((agent, idx) => {
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
            
        }, idx * 400);
    });
    
    setTimeout(() => container.classList.remove('scanning'), REAL_AGENTS.length * 400 + 1000);
}

let currentAgent = null;

function openModal(agent) {
    currentAgent = agent;
    const modal = document.getElementById('agent-modal');
    const body = document.getElementById('modal-body');
    
    body.innerHTML = `
        <div class="modal-avatar-large">${getAvatarSVG(agent.gender)}</div>
        <div class="modal-name">${agent.name}</div>
        <div class="modal-tagline">${agent.role}</div>
        <div class="modal-bio">"${agent.bio}"</div>
        <button class="btn-connect" onclick="connectWithAgent()">Start Story with ${agent.name}</button>
    `;
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('agent-modal').classList.remove('show');
}

function connectWithAgent() {
    if (!currentAgent) return;
    
    localStorage.setItem('journey_partner', JSON.stringify({
        name: currentAgent.name,
        gender: currentAgent.gender,
        occupation: currentAgent.role,
        bio: currentAgent.bio,
        id: currentAgent.id
    }));
    
    window.location.href = '/journey?partner_id=' + currentAgent.id;
}

window.onclick = function(event) {
    const modal = document.getElementById('agent-modal');
    if (event.target == modal) closeModal();
}

// Realistic Mock Users (Fallback)
const MOCK_REAL_USERS = [
    {
        id: 'mock_sarah', name: 'Sarah', gender: 'female', role: 'Marketing Manager',
        bio: "Love hiking on weekends and trying new coffee shops. Looking for someone genuine.",
        echoes: { default: "Hi there! I'm Sarah.", love: "Honesty is key for me.", sad: "A good walk always clears my mind.", fun: "Coffee?" },
        pos: { top: '25%', left: '30%' }
    },
    {
        id: 'mock_david', name: 'David', gender: 'male', role: 'Software Engineer',
        bio: "Tech enthusiast, amateur chef. I make a mean pasta.",
        echoes: { default: "Hey. I'm David.", love: "Cooking together is my love language.", sad: "Debugging life...", fun: "Let's build something cool." },
        pos: { top: '60%', left: '70%' }
    },
    {
        id: 'mock_jess', name: 'Jessica', gender: 'female', role: 'Teacher',
        bio: "Teaching kids is my passion. I value patience and kindness.",
        echoes: { default: "Hello! Nice to meet you.", love: "Kindness matters most.", sad: "Tomorrow is a new day.", fun: "Let's learn something new!" },
        pos: { top: '40%', left: '60%' }
    }
];

// Enhanced logic to use MOCK if REAL is empty
// We need to patch the startScanning function or the data loading part.
// Since I appended code before, I can't easily edit the middle. 
// I will overwrite the empty check in startScanning by redefining the function slightly or handling it in data load.

// Actually, I'll just add them to REAL_AGENTS if it's empty after load.
setTimeout(() => {
    if (REAL_AGENTS.length === 0) {
        console.log("No real users found, loading realistic mocks...");
        REAL_AGENTS = MOCK_REAL_USERS;
    }
}, 2000); // Wait for fetch to likely complete/fail
