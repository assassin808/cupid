document.addEventListener('DOMContentLoaded', () => {
  // Get user ID from URL parameters
  const params = new URLSearchParams(window.location.search);
  const agent = JSON.parse(params.get('agent'));
  const userId = Number(params.get("userId"))
  console.log(userId)
  console.log(agent)
  document.getElementById('user-avatar').src = agent.avatarUrl;
  document.getElementById('user-name').textContent = agent.name;
  document.getElementById('user-emoji').textContent = agent.emoji;
  document.getElementById('rating-number').textContent = agent.rating;
  
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
      const formattedText = res.report.replace(/\n/g, '<br>');
      document.getElementById('reportContainer').innerHTML = formattedText;
    });
  }
});