document.addEventListener('DOMContentLoaded', () => {
    const deck = document.getElementById('card-deck');
    const btnPass = document.getElementById('btn-pass');
    const btnLike = document.getElementById('btn-like');
    let candidates = [];
    let currentIndex = 0;

    // Load candidates
    fetch('/api/discovery/candidates')
        .then(res => res.json())
        .then(data => {
            if (data.status === 'ok') {
                candidates = data.candidates;
                renderCards();
            }
        })
        .catch(err => console.error(err));

    function renderCards() {
        deck.innerHTML = '';
        
        if (currentIndex >= candidates.length) {
            document.querySelector('.empty-state').style.display = 'block';
            document.querySelector('.controls').style.display = 'none';
            return;
        }

        // Render top 3 cards to maintain stack effect
        const toRender = candidates.slice(currentIndex, currentIndex + 3);
        
        toRender.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            card.innerHTML = `
                <div class="card-avatar" style="background: ${agent.avatar_color}">
                    ${getGenderEmoji(agent.gender)}
                </div>
                <div class="card-info">
                    <h2 class="card-name">${agent.nickname}, ${agent.age}</h2>
                    <div class="card-role">${agent.occupation}</div>
                    <p class="card-bio">"${agent.bio}"</p>
                    <div class="card-tags">
                        ${agent.interests.split(',').map(tag => `<span class="tag">#${tag.trim()}</span>`).join('')}
                    </div>
                </div>
            `;
            deck.appendChild(card);
        });
    }

    function handleSwipe(action) {
        const cards = document.querySelectorAll('.agent-card');
        if (cards.length === 0) return;
        
        const topCard = cards[0];
        const currentAgent = candidates[currentIndex];
        
        // Animation
        topCard.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
        if (action === 'pass') {
            topCard.style.transform = 'translateX(-120%) rotate(-20deg)';
            topCard.style.opacity = '0';
            setTimeout(() => {
                currentIndex++;
                renderCards();
            }, 300);
        } else {
            // LIKE -> Go to Sandbox
            topCard.style.transform = 'translateX(120%) rotate(20deg)';
            topCard.style.opacity = '0';
            
            // Prepare data for sandbox
            const partnerData = {
                nickname: currentAgent.nickname,
                age: currentAgent.age,
                gender: currentAgent.gender,
                occupation: currentAgent.occupation,
                interests: currentAgent.interests,
                bio: currentAgent.bio
            };
            
            sessionStorage.setItem('selected_partner_agent', JSON.stringify(partnerData));
            
            // Small delay then redirect
            setTimeout(() => {
                window.location.href = '/sandbox';
            }, 300);
        }
    }

    btnPass.addEventListener('click', () => handleSwipe('pass'));
    btnLike.addEventListener('click', () => handleSwipe('like'));

    function getGenderEmoji(gender) {
        return gender === 'female' ? '👩' : '👨';
    }
});
