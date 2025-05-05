const userId = 1;
const userGender = 'male'
const userName = "Zhengyang YAN"
class ChatAgent {
    constructor(name, id) {
        this.name = name;
        this.messages = [];
        this.id = Number(id);
    }

    async sendMessage(content) {
        try {
            const response = await fetch('/users/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "sender_id":userId,
                    name: this.name,
                    id: this.id,
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


var History = new Object();
// Initialize chat interface
$(document).ready(function() {
    /*
    const agents = [
        { id: 1, name: "Zhengyang YAN", lastMessage: "Hello! I'm Zhengyang YAN." },
        { id: 2, name: "Hellen", lastMessage: "Hi there!" },
        { id: 3, name: "Bob", lastMessage: "Nice to meet you!" }
    ];
*/
    var agents =[]
    $.ajax({
        url:"/users/get-list",
        method:"POST",
        headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json' 
        },
        async: false,
        dataType:"json",
        data:JSON.stringify({
            user_Id:userId
        })
    }).done(function(res){
        agents = res
    })

    
    let currentAgent = null;
    let chatMessages = {};


    // Function to load chat history
    async function loadChatHistory() {
        try {
            const response = await fetch('/users/load_history',{
                method:"POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body:JSON.stringify({
                    "id":userId
                })
            });
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            const data = await response.json();
            chatMessages = data.conversations || {};
            History = chatMessages
            //console.log(chatMessages)
            // Update last messages for agents
            agents.forEach(agent => {
                var agentHistory = chatMessages.chat.find(item=> item.receiver_id == agent.id) || {};
                if (agentHistory.content && agentHistory.content.length > 0) {
                    const lastMessage = agentHistory.content[agentHistory.content.length - 1].message;
                    agent.lastMessage = lastMessage.substring(0, 30) + (lastMessage.length > 30 ? '...' : '');
                }
                else {
                    agent.lastMessage = '';
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
                    <div class="avatar">
                        <img src="${agent.avatarUrl}" alt="${agent.name}" class="avatar-img">
                    </div>
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
        currentAgent = agents.find(a => a.id === Number(agentId));
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
        const agentHistory = History.chat.find(item => item.receiver_id == Number(agentId))
        if (agentHistory.content) {
            agentHistory.content.forEach(msg => {
                addMessage(msg.message, msg.type == "sent"?true:false, new Date(), false, false);
            });
        }
        // Scroll to bottom
        $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
    }

    // Function to add a message to the chat
    function addMessage(message, isUser = true, timestamp = null, isWelcome = false, isStore = true) {
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
            if(isStore)
            {
                var agentHistory = History.chat.find(item => item.receiver_id == Number(currentAgent.id))
                agentHistory.content.push({ 
                    message: message, 
                    type: isUser?"sent":"received"
                });
            }

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
            const agent = new ChatAgent(currentAgent.name, currentAgent.id);
            const response = await agent.sendMessage(message);

            // Remove typing indicator and add response
            typingIndicator.remove();
            addMessage(response, false);
        } else if (!currentAgent) {
            alert('Please select a chat first');
        }
    });

    // Handle dating button click
    $('#datingButton').click(async function() {
        const typingIndicator = $('<div>').addClass('message bot-message typing-indicator');
            typingIndicator.html('<div class="message-content"><span></span><span></span><span></span></div>');
            $('.chat-messages').append(typingIndicator);
            $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
        if (currentAgent) {
            const response = await fetch('/users/dating', {
                method:"POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "user_Id":userId,
                    user_gender: userGender,
                    name: currentAgent.name,
                    id: currentAgent.id,
                    user_name: userName
                })
            });
            const result = await response.json();
            if(result.status == 'ok'){
                loadChatHistory().then(()=> switchChat(currentAgent.id))
                typingIndicator.remove()
            }
                
            // Add system message about dating status
            //addMessage(result.message, false);
        } else {
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
        const params = new URLSearchParams(window.location.search);
        if(params.get("agentId")){
            agentId = params.get("agentId")
            switchChat(agentId)
        }
    });

    // Initially hide input container and show no-chat message
    $('#inputContainer').hide();
    $('#noChatSelected').show();
}); 