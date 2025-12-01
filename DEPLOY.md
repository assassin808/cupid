# Cupid AI 部署指南

> 一份简洁的部署说明，帮助你把 Cupid 部署到云端。

---

## 🚀 快速开始（本地运行）

### 1. 安装依赖

```bash
cd cupid
pip install -r requirements.txt
```

### 2. 启动 Redis（本地）

```bash
# Mac
brew install redis
redis-server
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件：

```env
OPENROUTER_API_KEY=sk-or-v1-你的key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### 4. 运行

```bash
python app.py
```

打开浏览器访问：`http://localhost:5001/login_register`

---

## ☁️ 云端部署（Render）——超详细版

下面假设你已经有：

- 一个 GitHub 账号
- 这个项目已经是一个 git 仓库（如果不是，也没关系，我会写出来）

### Step 0：把代码推到 GitHub（只做一次）

1. 打开终端，进入项目目录：

   ```bash
   cd /Users/assassin808/Desktop/research_2025_xuan/yan/cupid
   ```

2. 如果还没有初始化 git：

   ```bash
   git init
   git add .
   git commit -m "initial commit for deploy"
   ```

3. 在 GitHub 网站新建一个仓库（例如叫 `cupid-ai`），创建完成后，会给你一段命令类似：

   ```bash
   git remote add origin git@github.com:你的用户名/cupid-ai.git
   git branch -M main
   git push -u origin main
   ```

   在终端里依次执行这几行，让代码推到 GitHub。

> 之后如果你改了代码，只需要：
>
> ```bash
> git add .
> git commit -m "update"
> git push
> ```

---

### Step 1：准备云数据库 MongoDB（Atlas）

1. 打开浏览器，访问 `https://www.mongodb.com/atlas`。
2. 注册 / 登录账号。
3. 进入后，选择 **Build a Database** → 选 **Free（免费层）**。
4. 选择一个区域（离你和 Render 近一点就行），一路下一步创建集群。
5. 集群创建完后：
   - 在左侧点击 **Database → Connect**。
   - 选择 **Connect your application**。
   - 选择 Python 驱动，复制连接字符串，大概长这样：

     ```text
     mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/cupid
     ```

6. 把 `<user>` 和 `<password>` 换成你实际创建的数据库用户和密码。
7. 这个完整的字符串等会要贴到 Render 里，作为 `MONGODB_URI`。

---

### Step 2：准备云 Redis（可选，但推荐）

如果你暂时不想折腾 Redis，可以先跳过这一步，本地 Redis 仍然可用。  
如果你希望线上也支持登录 Session，建议：

1. 打开 `https://upstash.com/` 注册账号。
2. 创建一个 Redis 数据库，区域随便选一个你喜欢的（和 Render 接近即可）。
3. 创建完后，在控制台可以看到一个 URL，例如：

   ```text
   rediss://default:xxxxxx@apn1-thundering-12345.upstash.io:6379
   ```

4. 复制这个 URL，等会在 Render 里作为 `REDIS_URL` 用。

---

### Step 3：在 Render 创建 Web Service

1. 打开 `https://render.com/`，注册 / 登录。
2. 顶部点击 **New** → 选择 **Web Service**。
3. 选择 **Build and deploy from a Git repository**。
4. 第一次会让你连接 GitHub，按提示授权即可。
5. 选择你刚才推的仓库（例如 `cupid-ai`）。

进入配置页面后，关键几项按下面填：

- **Name**：随便写，比如 `cupid-ai-demo`
- **Region**：随便选一个，离 MongoDB 近一点更好
- **Branch**：一般填 `main`（如果你用别的分支，就填对应名字）
- **Runtime**：`Python 3`
- **Build Command**：

  ```bash
  pip install -r requirements.txt
  ```

- **Start Command**：

  ```bash
  python app.py
  ```

> 不需要自己管端口，Render 会自动设置 `PORT`，而 `app.py` 里面已经用：
>
> ```python
> port = int(os.environ.get("PORT", 5001))
> ```

---

### Step 4：在 Render 设置环境变量

在同一个创建页面里，往下拉，找到 **Environment → Add Environment Variable**，依次添加：

1. `OPENROUTER_API_KEY`
   - Value：你的 OpenRouter API Key
2. `OPENROUTER_BASE_URL`
   - Value：`https://openrouter.ai/api/v1`
3. `MONGODB_URI`
   - Value：刚才在 MongoDB Atlas 复制的连接字符串（完整那一串）
4. （可选）`REDIS_URL`
   - Value：Upstash 给你的 Redis URL

确认每一项都 **没有多余空格**，特别是前后不要有空格或换行。

全部填好后，点页面最下方的 **Create Web Service**。

---

### Step 5：等待构建 & 查看日志

1. 创建后，Render 会自动拉代码、安装依赖、启动服务。
2. 在 Render 的服务页面中：
   - 顶部会显示当前状态：Building / Deploying / Live。
   - 中间有日志输出，如果有错误会显示在这里。
3. 等状态变成 **Live**，说明已经成功启动。

如果失败了，可以：

- 在日志里搜关键字：`ERROR`、`Traceback`、`ModuleNotFoundError`；
- 按提示补充依赖到 `requirements.txt`，再 `git push` 触发一次新的部署。

---

### Step 6：访问你的线上 Cupid

在 Render 服务页面右上角，会看到一个 URL，例如：

```text
https://cupid-ai-demo.onrender.com
```

你可以在浏览器访问：

- 登录页：`https://cupid-ai-demo.onrender.com/login_register`
- 游客模式：在登录页点击 **Continue as Guest (No Signup)**
- Home / Agent Hall：`https://cupid-ai-demo.onrender.com/home`
- Discovery：`https://cupid-ai-demo.onrender.com/discovery`
- Sandbox：`https://cupid-ai-demo.onrender.com/sandbox`

---

### Step 4: 访问你的应用

部署完成后，Render 会给你一个 URL，比如：

```
https://cupid-xxx.onrender.com
```

- 登录页：`/login_register`
- 游客模式：点击 "Continue as Guest"
- 主页：`/home`

---

## 📋 环境变量说明

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `OPENROUTER_API_KEY` | ✅ | LLM API 密钥 |
| `OPENROUTER_BASE_URL` | ✅ | `https://openrouter.ai/api/v1` |
| `MONGODB_URI` | ✅ | MongoDB 连接串 |
| `REDIS_URL` | ❌ | Redis 连接串（不填则用本地） |

---

## ❓ 常见问题

**Q: Agent 不说话 / 返回默认回复**  
A: 检查 `OPENROUTER_API_KEY` 是否正确配置

**Q: 登录后跳回登录页**  
A: 检查 Redis 是否正常运行，或配置 `REDIS_URL`

**Q: 头像不显示**  
A: 确保 `website/static/avatars/` 文件夹里有图片

---

## 🎉 完成！

现在你可以把链接分享给朋友测试了。

有问题随时问！

