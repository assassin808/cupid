// 用户信息列表
var userId = 1;
var userGender = 'male'
var userName = "Zhengyang YAN"
const emojiList = ['😫', '😣', '😘', '🥰', '😍'];
// 处理头像点击事件
function handleAvatarClick(agentId) {
  console.log('点击了用户ID:', agentId);
  // 这里可以添加更多点击后的处理逻辑
  user = users.find((a) => a['id'] == agentId)
  window.open(`/report?agent=${JSON.stringify(user)}&userId=${JSON.stringify(userId)}`)
}

// 渲染头像矩阵
function renderAvatars(showRatings = false) {
  const container = document.getElementById('avatar-matrix');
  container.innerHTML = users.map((user, idx) => `
    <div class="avatar-box">
      <img class="avatar-img" src="${user.avatarUrl}" alt="${user.name}" onclick="handleAvatarClick('${user.id}')" style="cursor: pointer;">
      <span class="avatar-emoji" id="emoji-${idx+1}" style="opacity:${user.showEmoji ? 1 : 0}">${user.emoji}</span>
      <div class="user-name">${user.name}</div>
      <div class="rating-text" style="opacity:${showRatings ? 1 : 0}">Match Rating:${user.rating}</div>
    </div>
  `).join('');
}

// 控制某个头像的emoji显示或隐藏
function setEmojiVisible(id, visible) {
  user = users.find((d)=> d.id == id)
  user.showEmoji = visible;
  renderAvatars();
}

// 爱心按钮点击效果
function toggleHeart() {
  const heart = document.getElementById('heart-svg');
  heart.classList.toggle('liked');
  showHeartLoading();
}

async function showHeartLoading() {
  const loadingDiv = document.getElementById('heart-loading');
  loadingDiv.innerHTML = '<div class="loader"></div>';
  loadingDiv.style.display = 'block';
  users.forEach((user)=>{
    randomRating = Math.floor(Math.random() * 50);
    user.rating = randomRating;
    user.emoji = emojiList[Math.floor(user.rating/10)]
    user.showEmoji = true
  })

  const response = await fetch('/matching', {
    method:"POST",
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        "user_Id":userId,
        "user_name":userName,
        "agents":users
    })
  });
  const result = await response.json();
  if(result.status == 'ok'){
      loadingDiv.innerHTML = '<div class="success-tip">Matching Sucess!</div>';
      renderAvatars(true); // 显示评分
      setTimeout(() => {
      loadingDiv.innerHTML = '<div class="success-tip">Matching Sucess!</div>';
      renderAvatars(true); // 显示评分
      
      setTimeout(() => {
        loadingDiv.style.display = 'none';
        loadingDiv.innerHTML = '';
        
        // 自动触发排序
        animateSort(() => {
          users.sort((a, b) => b.rating - a.rating);
          renderAvatars(true);
        });
      }, 1200);
    }, 100);
  }

}

// 排序动画辅助函数
function animateSort(callback) {
  const matrix = document.getElementById('avatar-matrix');
  matrix.style.opacity = '0';
  setTimeout(() => {
    callback();
    matrix.style.opacity = '1';
  }, 400);
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 登录状态检查
  try {
    const res = await fetch('/get_user_info', {
      method: 'GET',
      credentials: 'include'
    });
    if (res.status === 401) {
      window.location.href = '/login_register';
      return;
    }
    const data = await res.json();
    if (data.status && data.status === 'not_logged_in') {
      window.location.href = '/login_register';
      return;
    }
    // 已登录，继续后续逻辑
    userId = data._id
    userGender = data.information.gender
    userName = data.information.nickname
    try{
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
        users = res
        console.log(res)
      })
      renderAvatars();
      users.forEach((user)=>{
        setEmojiVisible(user.id,false)
      })
    }
    catch(e){
      alert("Network Error!")
      return;
    }
    

  } catch (e) {
    window.location.href = '/login_register';
    return;
  }

  

}); 