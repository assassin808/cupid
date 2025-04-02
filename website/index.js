$(document).ready(function() {
    // Function to add a message to the chat
    function addMessage(message, isUser = true) {
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
    }

    // Function to handle user replies
    function reply(message) {
        // Add user message
        addMessage(message, true);
        
        // Simulate typing indicator
        const typingIndicator = $('<div>').addClass('message bot-message typing-indicator');
        typingIndicator.html('<div class="message-content"><span></span><span></span><span></span></div>');
        $('.chat-messages').append(typingIndicator);
        $('.chat-messages').scrollTop($('.chat-messages')[0].scrollHeight);
        
        // Remove typing indicator and add response after delay
        setTimeout(() => {
            typingIndicator.remove();
            addMessage("I received your message: " + message, false);
        }, 1500);
    }

    // Handle send button click
    $('#sendButton').click(function() {
        const message = $('#messageInput').val().trim();
        if (message) {
            reply(message);
            $('#messageInput').val('');
        }
    });

    // Handle enter key press
    $('#messageInput').keypress(function(e) {
        if (e.which == 13) {
            $('#sendButton').click();
        }
    });

    // Make reply function available globally
    window.reply = reply;

    // Add initial greeting
    setTimeout(() => {
        addMessage("Hello! I'm Cupid. How can I help you today?", false);
    }, 500);
});


