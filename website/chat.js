import { Agent } from './utiles.py'


class ChatAgent {
    constructor(name) {
        this.name = name;
        this.messages = [];
    }

    async sendMessage(content) {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: this.name,
                    content: content
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.message;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, I encountered an error while processing your message.';
        }
    }
}

// Initialize chat interface
$(document).ready(function() {
    const agents = [
        { id: 1, name: "Zhengyang YAN", lastMessage: "Hello! I'm Zhengyang YAN." },
        { id: 2, name: "Alice", lastMessage: "Hi there!" },
        { id: 3, name: "Bob", lastMessage: "Nice to meet you!" }
    ];

    let currentAgent = null;
    let chatMessages = {};

    // Function to save chat history
    async function saveChatHistory() {
        try {
            const response = await fetch('/api/save_history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversations: chatMessages })
            });

            if (!response.ok) {
                throw new Error('Failed to save chat history');
            }
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    // Function to load chat history
    async function loadChatHistory() {
        try {
            const response = await fetch('/api/load_history');
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            const data = await response.json();
            chatMessages = data.conversations || {};
            
            // Update last messages for agents
            agents.forEach(agent => {
                const agentHistory = chatMessages[agent.id];
                if (agentHistory && agentHistory.length > 0) {
                    const lastMessage = agentHistory[agentHistory.length - 1];
                    agent.lastMessage = lastMessage.text.substring(0, 30) + (lastMessage.text.length > 30 ? '...' : '');
                }
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
            chatMessages = {};
        }
    }

    // Function to create chat list
    function createChatList() {
        const chatList = $('#chatList');
        chatList.empty();

        agents.forEach(agent => {
            const chatItem = $('<li>').addClass('chat-list-item')
                .attr('data-agent-id', agent.id)
                .html(`
                    <div class="avatar">${agent.name.charAt(0)}</div>
                    <div class="user-info">
                        <div class="user-name">${agent.name}</div>
                        <div class="last-message">${agent.lastMessage}</div>
                    </div>
                `);

            chatItem.click(function() {
                switchChat(agent.id);
            });

            chatList.append(chatItem);
        });
    }

    // Function to switch between chats
    function switchChat(agentId) {
        currentAgent = agents.find(a => a.id === agentId);
        
        // Update active state in chat list
        $('.chat-list-item').removeClass('active');
        $(`.chat-list-item[data-agent-id="${agentId}"]`).addClass('active');

        // Update chat title
        $('#chatTitle').html(`<i class="fas fa-user me-2"></i>${currentAgent.name}`);

        // Show input container and hide no-chat message
        $('#inputContainer').show();
        $('#noChatSelected').hide();

        // Clear and load messages
        $('.chat-messages').empty();
        if (chatMessages[agentId]) {
            chatMessages[agentId].forEach(msg => {
                addMessage(msg.text, msg.isUser, msg.timestamp, false);
            });
        } else {
            chatMessages[agentId] = [];
            const welcomeMessage = `Hello! I'm ${currentAgent.name}. How can I help you today?`;
            addMessage(welcomeMessage, false, new Date().toISOString(), false);
        }

        // Scroll to bottom
        $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
    }

    // Function to add a message to the chat
    function addMessage(message, isUser = true, timestamp = null, isWelcome = false) {
        const messageDiv = $('<div>').addClass('message');
        const messageContent = $('<div>').addClass('message-content');
        
        if (isUser) {
            messageDiv.addClass('user-message');
        } else {
            messageDiv.addClass('bot-message');
        }
        
        messageContent.text(message);
        messageDiv.append(messageContent);
        $('.chat-messages').append(messageDiv);
        
        // Scroll to bottom
        $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);

        // Store message
        if (currentAgent) {
            if (!chatMessages[currentAgent.id]) {
                chatMessages[currentAgent.id] = [];
            }
            chatMessages[currentAgent.id].push({ 
                text: message, 
                isUser,
                timestamp: timestamp || new Date().toISOString()
            });

            // Save chat history after each message
            saveChatHistory();

            // Update last message in chat list
            if (!isUser) {
                const agent = agents.find(a => a.id === currentAgent.id);
                if (agent) {
                    agent.lastMessage = message.substring(0, 30) + (message.length > 30 ? '...' : '');
                    createChatList();
                    $(`.chat-list-item[data-agent-id="${currentAgent.id}"]`).addClass('active');
                }
            }
        }
    }

    // Handle send button click
    $('#sendButton').click(async function() {
        const message = $('#messageInput').val().trim();
        if (message && currentAgent) {
            // Add user message
            addMessage(message, true);
            $('#messageInput').val('');

            // Create typing indicator
            const typingIndicator = $('<div>').addClass('message bot-message typing-indicator');
            typingIndicator.html('<div class="message-content"><span></span><span></span><span></span></div>');
            $('.chat-messages').append(typingIndicator);
            $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);

            // Get agent response
            const agent = new ChatAgent(currentAgent.name);
            const response = await agent.sendMessage(message);

            // Remove typing indicator and add response
            typingIndicator.remove();
            addMessage(response, false);
        } else if (!currentAgent) {
            alert('Please select a chat first');
        }
    });

    // Handle enter key press
    $('#messageInput').keypress(function(e) {
        if (e.which == 13) {
            $('#sendButton').click();
        }
    });

    // Load chat history and initialize chat list
    loadChatHistory().then(() => {
        createChatList();
    });

    // Initially hide input container and show no-chat message
    $('#inputContainer').hide();
    $('#noChatSelected').show();
}); 