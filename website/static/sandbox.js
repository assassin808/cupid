// Cupid AI Sandbox JavaScript

// Global state
let avatars = {
    avatar1: null,
    avatar2: null
};

let simulationRunning = false;
let socket = null;

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
    checkBothAvatarsReady();
    addSampleButtons();
    initializeSocket();
});

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
        
        // Handle different types of progress updates
        if (data.step === 'scenario_generated') {
            addLiveScenario(data.iteration, data.scenario);
        } else if (data.step === 'decision_made') {
            addLiveDecision(
                data.avatar_name,
                data.gender,
                data.decision,
                data.rationale
            );
        } else if (data.step === 'rating_updated') {
            document.getElementById('final-score').textContent = data.cumulative_rate || '-';
            updateScoreEmoji(data.cumulative_rate);
            
            // Add score update to live feed
            const liveContainer = document.getElementById('live-updates');
            if (liveContainer) {
                const scoreDiv = document.createElement('div');
                scoreDiv.className = 'live-score-update';
                scoreDiv.innerHTML = `
                    💕 Compatibility Score Updated: 
                    <span class="score-number">${data.cumulative_rate}/50</span>
                `;
                liveContainer.appendChild(scoreDiv);
                liveContainer.scrollTop = liveContainer.scrollHeight;
            }
        }
    });
    
    socket.on('simulation_completed', function(data) {
        console.log('Simulation completed:', data);
        simulationRunning = false;
        
        // Display final results
        displaySimulationResults(data);
        
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
    timelineContainer.innerHTML = '<div id="live-updates" class="live-updates"></div>';
    
    // Emit to Socket.IO
    socket.emit('start_sandbox_simulation', {
        avatar1: avatars.avatar1,
        avatar2: avatars.avatar2
    });
}

// Initialize results display
function initializeResultsDisplay() {
    document.getElementById('final-score').textContent = '-';
    document.getElementById('score-emoji').textContent = '⏳';
    document.getElementById('timeline-container').innerHTML = '<p class="loading-text">AI agents are interacting...</p>';
    document.getElementById('insights-container').innerHTML = '<p class="loading-text">Analyzing compatibility...</p>';
}

// Display simulation results
function displaySimulationResults(result) {
    // Display compatibility score
    const score = result.cumulative_rate || 25;
    document.getElementById('final-score').textContent = score;
    
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
    document.getElementById('score-emoji').textContent = emojiMap[emojiKey] || '💝';
}

// Display interaction timeline
function displayTimeline(simulationData) {
    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.innerHTML = '';
    
    if (!simulationData || simulationData.length === 0) {
        timelineContainer.innerHTML = '<p class="no-data">No simulation data available</p>';
        return;
    }
    
    simulationData.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = 'timeline-event';
        
        // Determine event type
        if (event.decision) {
            eventElement.classList.add('decision');
        } else {
            eventElement.classList.add('conversation');
        }
        
        eventElement.innerHTML = `
            <div class="event-title">${getEventTitle(event, index + 1)}</div>
            <div class="event-content">${getEventContent(event)}</div>
            <div class="event-time">Step ${index + 1}</div>
        `;
        
        timelineContainer.appendChild(eventElement);
    });
}

// Get event title based on event data
function getEventTitle(event, stepNumber) {
    if (event.decision) {
        return `💭 Decision Point ${stepNumber}`;
    } else if (event.scenario) {
        return `🎬 Scenario: ${event.scenario}`;
    } else {
        return `💬 Interaction ${stepNumber}`;
    }
}

// Get event content
function getEventContent(event) {
    if (event.decision && event.rationale) {
        return `<strong>Decision:</strong> ${event.decision}<br><em>Rationale:</em> ${event.rationale}`;
    } else if (event.scenario) {
        return event.scenario;
    } else {
        return JSON.stringify(event).substring(0, 200) + (JSON.stringify(event).length > 200 ? '...' : '');
    }
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
    
    const insightsContainer = document.getElementById('insights-container');
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

// Get compatibility description
function getCompatibilityDescription(score) {
    if (score >= 45) return 'Excellent Match! 💕';
    if (score >= 35) return 'Great Compatibility 😍';
    if (score >= 25) return 'Good Potential 😊';
    if (score >= 15) return 'Some Challenges 🤔';
    return 'Low Compatibility 💔';
}

// Show message function
function showMessage(message, type = 'info') {
    // Create or update message element
    let messageElement = document.getElementById('message-toast');
    if (!messageElement) {
        messageElement = document.createElement('div');
        messageElement.id = 'message-toast';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            max-width: 300px;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(messageElement);
    }
    
    // Set message and style based on type
    messageElement.textContent = message;
    messageElement.className = `message-toast ${type}`;
    
    const colors = {
        success: '#48bb78',
        error: '#f56565',
        info: '#4299e1',
        warning: '#ed8936'
    };
    
    messageElement.style.backgroundColor = colors[type] || colors.info;
    
    // Show message
    setTimeout(() => {
        messageElement.style.opacity = '1';
        messageElement.style.transform = 'translateX(0)';
    }, 100);
    
    // Hide message after 3 seconds
    setTimeout(() => {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(100%)';
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