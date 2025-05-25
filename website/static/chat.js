class ChatAgent {
    constructor(name, id) {
        this.name = name;
        this.messages = [];
        this.id = id;
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
// 验证登录状态并获取用户信息
async function verifyLoginAndGetUserInfo() {
    try {
        const response = await fetch('/get_user_info', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.status === 401) {
            window.location.href = '/login_register';
            return null;
        }
        
        const data = await response.json();
        if (data.status && data.status === 'not_logged_in') {
            window.location.href = '/login_register';
            return null;
        }
        return data;
    } catch (error) {
        console.error('Error verifying login:', error);
        window.location.href = '/login_register';
        return null;
    }
}

// Initialize chat interface
$(document).ready(async function() {
    // 验证登录并获取用户信息
    const userInfo = await verifyLoginAndGetUserInfo();
    if (!userInfo) return;

    // 更新用户信息
    const userId = userInfo._id;
    const userGender = userInfo.gender;
    const userName = userInfo.nickname;

    // 初始化 Socket.IO 连接
    const socket = io({
        query: {
            userId: userId
        }
    });

    // Socket.IO 事件处理
    socket.on('connect', () => {
    });

    socket.on('disconnect', () => {
    });

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    // 接收新消息
    socket.on('new_message', (data) => {
        // 检查消息是否来自当前聊天对象或发送给当前聊天对象
        if (currentAgent && 
            ((data.sender_id === currentAgent.id) || 
             (data.sender_id === userId && data.receiver_id === currentAgent.id))) {
            // 只有当消息不是自己刚刚发送的，或者是来自对方的消息时才显示
            if (data.sender_id !== userId || data.sender_id === currentAgent.id) {
                const isUser = data.sender_id === userId;
                addMessage(data.content, isUser);
            }
        }
        
        // 更新聊天列表中的最后一条消息
        const agent = agents.find(a => a.id === (data.sender_id === userId ? data.receiver_id : data.sender_id));
        if (agent) {
            agent.lastMessage = data.content.substring(0, 30) + (data.content.length > 30 ? '...' : '');
            createChatList();
        }
    });

    var agents = [];
    $.ajax({
        url: "/users/get-list",
        method: "POST",
        headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json' 
        },
        async: false,
        dataType: "json",
        data: JSON.stringify({
            user_Id: userId
        })
    }).done(function(res) {
        agents = res;
    });

    let currentAgent = null;
    let chatMessages = {};
    let typingTimeout = null;
    let isTyping = false;

    // Function to load chat history
    async function loadChatHistory() {
        try {
            const response = await fetch('/users/load_history', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    "id": userId
                })
            });
            if (!response.ok) {
                throw new Error('Failed to load chat history');
            }
            const data = await response.json();
            chatMessages = data.conversations || {};
            History = chatMessages;
            agents.forEach(agent => {
                var agentHistory = chatMessages.chat.find(item => item.receiver_id == agent.id) || {};
                if (agentHistory.content && agentHistory.content.length > 0) {
                    const lastMessage = agentHistory.content[agentHistory.content.length - 1].message;
                    agent.lastMessage = lastMessage.substring(0, 30) + (lastMessage.length > 30 ? '...' : '');
                }
                else {
                    agent.lastMessage = '';
                    chatMessages.chat.push({
                        receiver_id: agent.id,
                        content: []
                    })
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

            // 添加选中效果
            if (currentAgent && currentAgent.id === agent.id) {
                chatItem.addClass('selected');
            }

            chatItem.click(function() {
                switchChat(agent.id);
            });

            chatList.append(chatItem);
        });

        // 根据当前状态和窗口大小设置显示
        if (window.innerWidth < 768) {
            if (currentAgent) {
                $('.chat-list-container').removeClass('show');
                $('.chat-area-container').addClass('show');
                $('#backButton').show();
                $('#inputContainer').show();
                $('#noChatSelected').hide();
            } else {
                $('.chat-list-container').addClass('show');
                $('.chat-area-container').removeClass('show');
                $('#backButton').hide();
                $('#inputContainer').hide();
                $('#noChatSelected').show();
            }
        } else {
            if (currentAgent) {
                $('#inputContainer').show();
                $('#noChatSelected').hide();
            } else {
                $('#inputContainer').hide();
                $('#noChatSelected').show();
            }
        }
    }

    // Function to switch between chats
    function switchChat(agentId) {
        // 清除之前的打字状态
        $('.typing-indicator').remove();
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }
        isTyping = false;

        currentAgent = agents.find(a => a.id === agentId);
        
        // 移除所有选中效果
        $('.chat-list-item').removeClass('selected');
        
        // 为当前选中的聊天添加选中效果
        $(`.chat-list-item[data-agent-id="${agentId}"]`).addClass('selected');

        // Update chat title
        $('#chatTitle').html(`<i class="fas fa-user me-2"></i>${currentAgent.name}`);

        // Show input container and hide no-chat message
        $('#inputContainer').show();
        $('#noChatSelected').hide();

        // Show back button and chat area on mobile
        if (window.innerWidth < 768) {
            $('.back-home-fixed').hide();
            $('#backButton').show();
            $('.chat-list-container').removeClass('show');
            $('.chat-area-container').addClass('show');
        }

        // Clear and load messages
        $('.chat-messages').empty();
        const agentHistory = History.chat.find(item => item.receiver_id == agentId);
        if (agentHistory && agentHistory.content && agentHistory.content.length > 0) {
            agentHistory.content.forEach(msg => {
                addMessage(msg.message, msg.type == "sent", new Date(), false, false);
            });
            // 更新最新消息
            const lastMessage = agentHistory.content[agentHistory.content.length - 1].message;
            currentAgent.lastMessage = lastMessage.substring(0, 30) + (lastMessage.length > 30 ? '...' : '');
            createChatList();
        } else {
            // 如果没有历史消息，清空最新消息
            currentAgent.lastMessage = '';
            createChatList();
        }
        // Scroll to bottom
        $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
    }

    // Handle back button click
    $('#backButton').click(function() {
        $('.chat-area-container').removeClass('show');
        $('.chat-list-container').addClass('show');
        $('#backButton').hide();
        $('#chatTitle').html(`<i class="fas fa-robot me-2"></i>Select a chat`);
        $('#inputContainer').hide();
        $('#noChatSelected').show();
        // 移除所有选中效果
        $('.chat-list-item').removeClass('selected');
        // 显示返回主页按钮
        if (window.innerWidth < 768) {
            $('.back-home-fixed').show();
        }
    });

    // Handle window resize
    $(window).resize(function() {
        // 移除所有选中效果
        $('.chat-list-item').removeClass('selected');
        
        if (window.innerWidth >= 768) {
            // 在桌面端，移除移动端的特殊样式
            $('.chat-list-container').removeClass('show');
            $('.chat-area-container').removeClass('show');
            $('#backButton').hide();
            
            // 如果有选中的聊天，保持显示状态
            if (currentAgent) {
                $('#inputContainer').show();
                $('#noChatSelected').hide();
                $('#chatTitle').html(`<i class="fas fa-user me-2"></i>${currentAgent.name}`);
                // 恢复选中效果
                $(`.chat-list-item[data-agent-id="${currentAgent.id}"]`).addClass('selected');
            } else {
                $('#inputContainer').hide();
                $('#noChatSelected').show();
                $('#chatTitle').html(`<i class="fas fa-robot me-2"></i>Select a chat`);
            }
        } else {
            // 在移动端时，如果当前有选中的聊天，显示聊天界面
            if (currentAgent) {
                $('.chat-list-container').removeClass('show');
                $('.chat-area-container').addClass('show');
                $('#backButton').show();
                $('#inputContainer').show();
                $('#noChatSelected').hide();
                $('#chatTitle').html(`<i class="fas fa-user me-2"></i>${currentAgent.name}`);
                // 恢复选中效果
                $(`.chat-list-item[data-agent-id="${currentAgent.id}"]`).addClass('selected');
            } else {
                $('.chat-list-container').addClass('show');
                $('.chat-area-container').removeClass('show');
                $('#backButton').hide();
                $('#inputContainer').hide();
                $('#noChatSelected').show();
                $('#chatTitle').html(`<i class="fas fa-robot me-2"></i>Select a chat`);
            }
        }
    });

    // Function to add a message to the chat
    function addMessage(message, isUser = true, timestamp = null, isWelcome = false, isStore = true) {
        const messageDiv = $('<div>').addClass('message');
        const messageContent = $('<div>').addClass('message-content');
        
        if (isUser) {
            messageDiv.addClass('user-message');
        } else {
            messageDiv.addClass('bot-message');
            // 添加机器人头像
            const botAvatar = $('<div>').addClass('message-avatar')
                .html(`<img src="${currentAgent.avatarUrl}" alt="Bot">`);
            messageDiv.append(botAvatar);
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
                var agentHistory = History.chat.find(item => item.receiver_id == currentAgent.id)
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
                    $(`.chat-list-item[data-agent-id="${currentAgent.id}"]`).addClass('selected');
                }
            }
        }
    }

    // 监听输入框的输入事件
    $('#messageInput').on('input', function() {
        if (!currentAgent) return;

        // 如果之前没有在打字，发送开始打字状态
        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', {
                sender_id: userId,
                receiver_id: currentAgent.id,
                is_typing: true
            });
        }

        // 清除之前的定时器
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        // 设置新的定时器，3秒后发送停止打字状态
        typingTimeout = setTimeout(() => {
            isTyping = false;
            socket.emit('typing', {
                sender_id: userId,
                receiver_id: currentAgent.id,
                is_typing: false
            });
        }, 3000);
    });

    // 监听打字状态事件
    socket.on('typing_status', (data) => {
        if (currentAgent && data.sender_id === currentAgent.id) {
            if (data.is_typing) {
                // 显示打字状态
                if (!$('.typing-indicator').length) {
                    const typingIndicator = $('<div>').addClass('message bot-message typing-indicator');
                    const botAvatar = $('<div>').addClass('message-avatar')
                        .html(`<img src="${currentAgent.avatarUrl}" alt="Bot">`);
                    typingIndicator.append(botAvatar);
                    typingIndicator.append('<div class="message-content"><span></span><span></span><span></span></div>');
                    $('.chat-messages').append(typingIndicator);
                    $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
                }
            } else {
                // 移除打字状态
                $('.typing-indicator').remove();
            }
        }
    });

    // Handle send button click
    $('#sendButton').click(async function() {
        const message = $('#messageInput').val().trim();
        if (message && currentAgent) {
            // 清除打字状态
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }
            isTyping = false;
            socket.emit('typing', {
                sender_id: userId,
                receiver_id: currentAgent.id,
                is_typing: false
            });

            // Add user message immediately for better UX
            addMessage(message, true);
            $('#messageInput').val('');

            try {
                // Send message through Socket.IO
                const messageData = {
                    sender_id: userId,
                    receiver_id: currentAgent.id,
                    content: message
                };
                socket.emit('send_message', messageData);
            } catch (error) {
                console.error('Error sending message:', error);
                // Show error message to user
                addMessage('Failed to send message. Please try again.', true);
            }
        } else if (!currentAgent) {
            alert('Please select a chat first');
        }
    });

    // Handle dating button click
    $('#datingButton').click(async function() {
        alert("Not available yet, please wait for the next update!")
        return;
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
        if(params.get("agentId")) {
            const agentId = parseInt(params.get("agentId"));
            switchChat(agentId);
        }
    });

    // Initially hide input container and show no-chat message
    $('#inputContainer').hide();
    $('#noChatSelected').show();
}); 