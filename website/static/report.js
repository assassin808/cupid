document.addEventListener('DOMContentLoaded', () => {
  // Get user ID from URL parameters
  const params = new URLSearchParams(window.location.search);
  const agent = JSON.parse(params.get('agent'));
  const userId = JSON.parse(params.get("userId"))
  console.log(userId)
  console.log(agent)
  document.getElementById('user-avatar').src = agent.avatarUrl;
  document.getElementById('user-name').textContent = agent.name;
  document.getElementById('user-emoji').textContent = agent.emoji;
  document.getElementById('rating-number').textContent = agent.rating;
  user_gender = agent.gender == 'male' ? 'female' : 'male';
  // Add click event listener for chat button
  document.getElementById('chatButton').addEventListener('click', () => {
    window.location.href = `/users?agentId=${agent.id}`;
  });
  
  if (agent) {
    // Fetch user data
    $.ajax({
      url: "/report/get-report",
      method: "POST",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        user_Id: userId,
        "agent":agent
      })
    }).done(function(res) {
      // Update user profile
      console.log(res.report)
      report = res.report;
      
      // Create a container for the report content
      const reportContainer = document.getElementById('reportContainer');
      reportContainer.innerHTML = ''; // Clear existing content
      
      // Process each report item
      report.forEach(item => {
        let content = '';
        
        // Create a container div for each item
        const itemContainer = document.createElement('div');
        itemContainer.style.marginBottom = '1.5rem';
        itemContainer.style.padding = '1rem';
        itemContainer.style.borderRadius = '8px';
        
        if (item.action) {
          // Style for action items
          itemContainer.style.backgroundColor = '#f0f7ff';
          itemContainer.style.border = '1px solid #d0e3ff';
          time = item.time;

          // Add time label for action items
          const timeLabel = document.createElement('div');
          timeLabel.style.fontWeight = 'bold';
          timeLabel.style.marginBottom = '0.5rem';
          timeLabel.style.color = '#1976d2';  // Blue color to match the background
          timeLabel.textContent = `Time: ${time}`;
          itemContainer.insertBefore(timeLabel, itemContainer.firstChild);

          if (item.action.type === 'predict') {
            // Style for prediction items
            content = item.action.question;
            itemContainer.style.backgroundColor = '#fff0f7';
            itemContainer.style.border = '1px solid #ffd0e3';
            timeLabel.style.color = '#c2185b';  // Pink color to match the background
          } else {
            // Style for other action items
            content = item.rationale;
          }
        } else {
          // Style for decision items based on gender
          if (item.gender === user_gender) {
            // Style for matching gender
            itemContainer.style.backgroundColor = '#f0fff4';
            itemContainer.style.border = '1px solid #d0ffd0';
          } else {
            // Style for different gender
            itemContainer.style.backgroundColor = '#fff4f0';
            itemContainer.style.border = '1px solid #ffd0d0';
          }
          content = item.decision.Content;

          // Add label for non-action items
          const label = document.createElement('div');
          label.style.fontWeight = 'bold';
          label.style.marginBottom = '0.5rem';
          label.style.color = item.gender === user_gender ? '#2e7d32' : '#c62828';
          label.textContent = item.gender === user_gender ? 'You:' : `${agent.name}:`;
          itemContainer.insertBefore(label, itemContainer.firstChild);

          // Add rationale if it exists
          if (item.rationale) {
            const rationaleDiv = document.createElement('div');
            rationaleDiv.style.marginTop = '0.5rem';
            rationaleDiv.style.padding = '0.5rem';
            rationaleDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            rationaleDiv.style.borderRadius = '4px';
            rationaleDiv.style.fontStyle = 'italic';
            rationaleDiv.style.color = '#666';
            rationaleDiv.textContent = `Thought: ${item.rationale}`;
            itemContainer.appendChild(rationaleDiv);
          }
        }
        
        // Create a new paragraph for the content
        const paragraph = document.createElement('p');
        paragraph.textContent = content;
        paragraph.style.margin = '0';
        paragraph.style.lineHeight = '1.5';
        paragraph.style.color = '#333';
        
        // Add the paragraph to the container
        itemContainer.appendChild(paragraph);
        reportContainer.appendChild(itemContainer);
      });
    });
  }
});