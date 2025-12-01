from flask import Flask
from flask import render_template,request,redirect,url_for,session,jsonify,abort
from utils import Agent
from utils import Dating
from utils import Matching
from bson.objectid import ObjectId
import redis
from flask_session import Session
import secrets
import json
import os
from urllib.parse import urlparse
from Database import dbClient
from socket_events import socketio
app = Flask(__name__,template_folder="website",static_folder = "website/static")
app.config['UPLOAD_FOLDER'] = 'website/static/'
secret_key =secrets.token_hex(32)
app.secret_key = secret_key

# Redis Session Configuration - Support both cloud Redis and local Redis
redis_url = os.getenv("REDIS_URL")
if redis_url:
    # Use cloud Redis (e.g., Upstash, Render Redis)
    try:
        url = urlparse(redis_url)
        app.config['SESSION_TYPE'] = 'redis'
        app.config["SESSION_REDIS"] = redis.Redis(
            host=url.hostname,
            port=url.port or 6379,
            password=url.password,
            db=0,
            ssl=url.scheme == "rediss"  # Support rediss:// for SSL
        )
        print(f"[Config] Using cloud Redis at {url.hostname}:{url.port}")
    except Exception as e:
        print(f"[Config] Failed to connect to cloud Redis: {e}, falling back to filesystem session")
        app.config['SESSION_TYPE'] = 'filesystem'
        app.config['SESSION_FILE_DIR'] = './flask_session'
else:
    # Try local Redis first (for local dev)
    try:
        app.config['SESSION_TYPE'] = 'redis'
        app.config["SESSION_REDIS"] = redis.Redis(host="localhost", port=6379, db=0)
        # Test connection
        app.config["SESSION_REDIS"].ping()
        print("[Config] Using local Redis")
    except Exception as e:
        # No Redis available - use filesystem-based session
        print(f"[Config] No Redis available ({e}), using filesystem-based session")
        app.config['SESSION_TYPE'] = 'filesystem'
        app.config['SESSION_FILE_DIR'] = './flask_session'

app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_NAME'] = 'session'
app.permanent_session_lifetime = 36000  # session 有效期为 1 小时
socketio.init_app(app)
Session(app)
@app.route('/', methods=["GET"])
@app.route('/home', methods=["GET"])
def Index():
    # If not logged in, always go to login / guest page
    if 'logged_user' not in session:
        return redirect(url_for('login_register'))
    # Logged-in users go to Home (Agent Hall)
    return render_template("home.html")


@app.route("/users",methods = ["GET","POST"])
def users():
    return render_template("chat.html")

@app.route("/users/get-list",methods = ["POST"])
def getList():
    data = request.get_json()
    db = dbClient()
    users = db.getCollection("Users").find({},{"password":0})
    list = []
    session_user = session['logged_user'] 
    for i in users:
        try:
            if str(i['_id']) != session_user['_id'] and i['information']['gender'] != session_user['information']['gender']:
                list.append({'name':i['information']['nickname'], 'id':str(i['_id']), 'avatarUrl':i['information']['avatar'], 'gender':i["information"]["gender"]})
        except:
            pass
    print(list)
    return list

@app.route("/users/load_history", methods=["POST"])
def load_history():
    data = request.get_json()
    print(data)
    db = dbClient()
    history = db.getCollection("chat-history").find_one({"sender_id":data["id"]})
    if history is None:
        db.getCollection("chat-history").insert_one({"sender_id":data["id"],"chat":[]})
        history = db.getCollection("chat-history").find_one({"sender_id":data["id"]})
    history.pop("_id")
    return {"conversations": history}
"""
@app.route("/users/chat", methods = ["POST"])
def chat():
    if request.method == "POST":
        data = request.get_json()
    agent = Agent("",data['name'],data['id'])

    #load history
    f = open("chat-history.json", "r")

    chatHistory = json.load(f)
    content = [d for d in chatHistory if d["sender_id"] == data["sender_id"]][0]
    try:
        messages = [d for d in content["chat"] if d["receiver_id"] == data["id"]][0]
        for i in messages["content"]:
            if i["type"] == "sent":
                agent.addMessage(i["message"],i["type"])
    except:
        messages = {"receiver_id":data["id"],"content":[]}
        content['chat'].append(messages)
    
    f.close()
    #get the response
    response = agent.sendMessage(data["content"])

    #save the history
    messages["content"].append({"type":"sent","message":data["content"]})
    messages["content"].append({"type":"received","message":response})
   

    for i,d in enumerate(content['chat']):
        if d["receiver_id"] == data["id"]:
            content['chat'][i] = messages
            break
    for i,d in enumerate(chatHistory):
        if d["sender_id"] == data["sender_id"]:
            chatHistory[i] = content
            break
    f = open("chat-history.json","w")
    f.write(json.dumps(chatHistory))
    f.close()
    return {"message": response}
"""
@app.route("/users/dating",methods = ["POST"])
def dating():
    data = request.get_json()
    male_agent = ''
    female_agent = ''
    if data["user_gender"] == "male":
        male_agent = Agent("",data['user_name'],data['user_Id'])
        female_agent = Agent("",data['name'],data['id'])
    elif data["user_gender"] == "female":
        female_agent = Agent("",data['user_name'],data['user_Id'])
        male_agent = Agent("",data['name'],data['id'])
    datingClass = Dating(female_agent,male_agent)
    female_rating,male_rating,female_messages,male_messages = datingClass.startDating()
    female_evaluation, male_evaluation = datingClass.evaluate()
    user_messages = ''
    agent_messages = ''
    user_evaluation = ''
    agent_evaluation = ''
    user_rating = ''
    agent_rating = ''
    if data["user_gender"] == "male":
        user_messages = male_messages
        agent_messages = female_messages
        user_evaluation = male_evaluation
        agent_evaluation = female_evaluation
        user_rating = male_rating
        agent_rating = female_rating
    elif data["user_gender"] == "female":
        agent_messages = male_messages
        user_messages = female_messages
        user_evaluation = female_evaluation
        agent_evaluation = male_evaluation
        user_rating = female_rating
        agent_rating = male_rating
    

    #load history
    f = open("chat-history.json", "r")

    chatHistory = json.load(f)
    content = [d for d in chatHistory if d["sender_id"] == data["user_Id"]][0]
    try:
        messages = [d for d in content["chat"] if d["receiver_id"] == data["id"]][0]
    except:
        messages = {"receiver_id":data["id"],"content":[]}
        content['chat'].append(messages)
    f.close()


    #save to history
    for item in user_messages:
        if item['role'] == 'user':
            messages['content'].append({'type':'received','message':item['content']})
        elif item['role'] == 'assistant':
            messages['content'].append({'type':'sent','message':item['content']})
    for item in agent_messages:
        if item['role'] == 'user':
            messages['content'].append({'type':'sent','message':item['content']})
        elif item['role'] == 'assistant':
            messages['content'].append({'type':'received','message':item['content']})
    
    messages['content'].append({'type':'sent','message':f"I would like to give you a rating {user_rating}/50"})
    messages['content'].append({'type':'received','message':f"I would like to give you a rating {agent_rating}/50"})
    
    messages['content'].append({'type':'sent','message': user_evaluation})
    messages['content'].append({'type':'received','message': agent_evaluation})
    
    for i,d in enumerate(content['chat']):
        if d["receiver_id"] == data["id"]:
            content['chat'][i] = messages
            break
    for i,d in enumerate(chatHistory):
        if d["sender_id"] == data["user_Id"]:
            chatHistory[i] = content
            break
    f = open("chat-history.json","w")
    f.write(json.dumps(chatHistory))
    f.close()
    
    return {"status":"ok"}
@app.route("/matching",methods = ["POST"])
def matching():
    data = request.get_json()
    print(data)
    matchingResult = ''
    try:
        if data['agent']['gender'] == 'male':
            matchingResult = Matching(ObjectId(data['user_Id']),ObjectId(data['agent']['id']))
        elif data['agent']['gender'] == 'female':
            matchingResult = Matching(ObjectId(data['agent']['id']),ObjectId(data['user_Id']))
        
        simulation_result, cumulative_rate = matchingResult.simulation()
        
        # Convert cumulative_rate to int safely
        try:
            cumulative_rate_int = int(cumulative_rate) if cumulative_rate else 25
        except:
            cumulative_rate_int = 25
        
        db = dbClient()
        
        # Store report with better structure
        report_data = {
            "simulation": simulation_result,
            "cumulative_rate": cumulative_rate_int,
            "timestamp": str(ObjectId())
        }
        
        if data['agent']['gender'] == 'male':
            db.getCollection("report").update_one(
                {"female_id":data['user_Id'],"male_id":data['agent']['id']},
                {"$set":report_data},
                upsert=True
            )
        elif data['agent']['gender'] == 'female':
            db.getCollection("report").update_one(
                {"male_id":data['user_Id'],"female_id":data['agent']['id']},
                {"$set":report_data},
                upsert=True
            )
        
        db.getCollection("matching-list").update_one(
            {"user_Id":data['user_Id']},
            {"$push":{"list":{
                "agent_id":data['agent']['id'],
                "rating":cumulative_rate_int
            }}},
            upsert=True
        )
        db.getCollection("matching-list").update_one(
            {"user_Id":data['agent']['id']},
            {"$push":{"list":{
                "agent_id":data['user_Id'],
                "rating":cumulative_rate_int
            }}},
            upsert=True
        )
        
        return {"status":"ok","cumulative_rate":cumulative_rate_int}
    except Exception as e:
        print(f"Matching error: {e}")
        import traceback
        traceback.print_exc()
        return {"status":"error","message":str(e)}, 500

@app.route("/users/get-matching-list",methods = ["POST"])
def get_matching_list():
    data = request.get_json()
    print(data)
    db = dbClient()
    matching_list = db.getCollection("matching-list").find_one({"user_Id":data['user_Id']})
    print(matching_list)
    if matching_list is None:
        db.getCollection("matching-list").insert_one({"user_Id":data['user_Id'],"list":[]})
        matching_list = db.getCollection("matching-list").find_one({"user_Id":data['user_Id']})
    return matching_list['list']
@app.route("/report", methods = ["GET"])
def report():
    return render_template("report.html")
@app.route("/report/get-report",methods = ["POST"])
def get_report():
    data = request.get_json()
    print(data)
    reports = ''
    try:
        db = dbClient()
        if data['agent']['gender'] == 'male':
            reports = db.getCollection("report").find_one({"female_id":data['user_Id'],"male_id":data['agent']['id']})
        elif data['agent']['gender'] == 'female':
            reports = db.getCollection("report").find_one({"male_id":data['user_Id'],"female_id":data['agent']['id']})
        
        if reports:
            # Return the simulation data from the new structure
            return {'report': reports.get('simulation', reports.get('reports', []))}
        else:
            return {'report': []}, 404
    except Exception as e:
        print(f"Report error: {e}")
        return {'report': [], 'error': str(e)}, 500

@app.route('/login_register', methods=['GET'])
def login_register():
    return render_template('login_register.html')

@app.route('/login_guest', methods=['POST'])
def login_guest():
    """
    One-click guest login for quick demo.
    Creates a lightweight guest user (if needed) and logs them in.
    """
    try:
        db = dbClient()
        # Create a fresh guest user each time to avoid collisions between testers
        guest_id = ObjectId()
        guest_email = f"guest+{str(guest_id)}@cupid.ai"
        guest_user = {
            "_id": guest_id,
            "email": guest_email,
            "password": "",           # no password (guest only, cannot log in via normal form)
            "is_guest": True,
            # Provide minimal profile so Hall / Discovery work without errors
            "information": {
                "nickname": "Guest",
                "gender": "neutral",
                "age": "25",
                "occupation": "Curious Explorer",
                "interests": "Trying AI dating, exploring Cupid",
                "bio": "Guest user exploring Cupid without an account.",
                "avatar": "static/avatars/instance.png"
            }
        }
        db.getCollection("Users").insert_one(guest_user)

        # Store in session (convert _id to string for JSON safety)
        guest_user["_id"] = str(guest_id)
        session['logged_user'] = guest_user
        session.modified = True

        return {"status": "ok", "guest": True, "email": guest_email}
    except Exception as e:
        print(f"Guest login error: {e}")
        return {"status": "fail", "message": "Guest login failed"}, 500

@app.route('/user_profile', methods=['GET'])
def user_profile():
    return render_template('user_profile.html')

@app.route('/user_settings', methods=['GET'])
def user_settings():
    return render_template('user_settings.html')

@app.route('/journey', methods=['GET'])
def journey():
    return render_template('journey.html')
 

@app.route('/discovery', methods=['GET'])
def discovery():
    return render_template('discovery.html')

@app.route('/sandbox', methods=['GET'])
def sandbox():
    return render_template('sandbox.html')

@app.route('/sandbox/create_avatar', methods=['POST'])
def create_avatar():
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    
    data = request.get_json()
    avatar_number = data.get('avatarNumber')
    avatar_data = data.get('avatarData')
    
    # Initialize sandbox avatars in session if not exists
    if 'sandbox_avatars' not in session:
        session['sandbox_avatars'] = {}
    
    # Store avatar in session
    session['sandbox_avatars'][f'avatar{avatar_number}'] = avatar_data
    session.modified = True
    
    return {"status":"ok","message":f"Avatar {avatar_number} created successfully"}

@app.route('/sandbox/matching', methods=['POST'])
def sandbox_matching():
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    
    data = request.get_json()
    avatar1 = data.get('avatar1')
    avatar2 = data.get('avatar2')
    
    if not avatar1 or not avatar2:
        return {"status":"fail","message":"Both avatars are required"}, 400
    
    try:
        # Create temporary ObjectIds for sandbox avatars
        temp_id1 = ObjectId()
        temp_id2 = ObjectId()
        
        # Determine gender order for Matching class
        if avatar1['gender'] == 'male' and avatar2['gender'] == 'female':
            matchingResult = Matching(temp_id2, temp_id1)  # female_id, male_id
            matchingResult.female_info = avatar2
            matchingResult.male_info = avatar1
        elif avatar1['gender'] == 'female' and avatar2['gender'] == 'male':
            matchingResult = Matching(temp_id1, temp_id2)  # female_id, male_id
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        else:
            # For same gender or other combinations, use first avatar as female, second as male for simulation
            matchingResult = Matching(temp_id1, temp_id2)
            matchingResult.female_info = avatar1
            matchingResult.male_info = avatar2
        
        # Override the database lookup in Matching class for sandbox mode
        def mock_get_user_info(user_id):
            if str(user_id) == str(temp_id1):
                return avatar1
            elif str(user_id) == str(temp_id2):
                return avatar2
            return None
        
        # Temporarily replace the database access
        original_method = matchingResult.get_user_info if hasattr(matchingResult, 'get_user_info') else None
        
        # Run simulation with sandbox data
        simulation_result, cumulative_rate = matchingResult.simulation()
        
        # Convert cumulative_rate to int safely
        try:
            cumulative_rate_int = int(cumulative_rate) if cumulative_rate else 25
        except:
            cumulative_rate_int = 25
        
        return {
            "status":"ok",
            "simulation": simulation_result,
            "cumulative_rate": cumulative_rate_int,
            "message": "Sandbox simulation completed successfully"
        }
        
    except Exception as e:
        print(f"Sandbox simulation error: {e}")
        import traceback
        traceback.print_exc()
        return {"status":"error","message":str(e)}, 500

@app.route('/sandbox/feedback', methods=['POST'])
def sandbox_feedback():
    """
    Collect user feedback on simulations.
    Note: Simulation data is auto-saved when simulation completes.
    This endpoint only saves the feedback for research analysis.
    """
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    try:
        data = request.get_json() or {}
        db = dbClient()
        user_id = session['logged_user'].get('_id')
        
        # Save feedback for analysis (simulation is auto-saved on completion)
        feedback_doc = {
            "user_id": user_id,
            "created_at": str(ObjectId()),
            "cumulative_rate": data.get('cumulative_rate'),
            "global_feedback": data.get('global_feedback', {}),
            "moment_feedback": data.get('moment_feedback', []),
            "persona": data.get('persona'),
            "partner_persona": data.get('partner_persona')
        }
        db.getCollection("sandbox-feedback").insert_one(feedback_doc)
        
        return {"status": "ok"}
    except Exception as e:
        print(f"Sandbox feedback error: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": "Failed to save feedback"}, 500

@app.route('/sandbox/trajectory', methods=['GET'])
def get_trajectory():
    """Get all past simulations for the logged-in user"""
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    try:
        db = dbClient()
        user_id = session['logged_user'].get('_id')
        simulations = list(db.getCollection("sandbox-simulations").find(
            {"user_id": user_id},
            {"simulation": 0}  # Exclude full simulation data for list view
        ).sort("created_at", -1).limit(50))
        
        # Convert ObjectId to string
        for sim in simulations:
            sim['_id'] = str(sim['_id'])
        
        return {"status": "ok", "simulations": simulations}
    except Exception as e:
        print(f"Get trajectory error: {e}")
        return {"status": "error", "message": str(e)}, 500

@app.route('/sandbox/simulation/<simulation_id>', methods=['GET'])
def get_simulation_detail(simulation_id):
    """Get full details of a specific simulation for replay"""
    if 'logged_user' not in session:
        return {"status":"fail","message":"Not logged in"}, 401
    try:
        from bson.objectid import ObjectId
        db = dbClient()
        user_id = session['logged_user'].get('_id')
        sim = db.getCollection("sandbox-simulations").find_one({
            "_id": ObjectId(simulation_id),
            "user_id": user_id
        })
        
        if not sim:
            return {"status": "error", "message": "Simulation not found"}, 404
        
        sim['_id'] = str(sim['_id'])
        return {"status": "ok", "simulation": sim}
    except Exception as e:
        print(f"Get simulation detail error: {e}")
        return {"status": "error", "message": str(e)}, 500

@app.route('/api/user/history', methods=['GET'])
def user_history():
    """Get comprehensive history: Short Sparks & Long Simulations"""
    if 'logged_user' not in session:
        return {"status":"fail", "message":"Not logged in"}, 401
        
    try:
        db = dbClient()
        user_id = session['logged_user']['_id']
        
        # 1. Short Interactions (Hall Sparks)
        shorts = list(db.getCollection("short-interactions").find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(20))
        
        # Enrich shorts with agent info if possible (mock for now or fetch)
        for s in shorts:
            s['_id'] = str(s['_id'])
            # In real app, fetch target user info here
        
        # 2. Long Simulations (Sandbox)
        longs = list(db.getCollection("sandbox-simulations").find(
            {"user_id": user_id},
            {"simulation": 0} 
        ).sort("created_at", -1).limit(20))
        
        for l in longs:
            l['_id'] = str(l['_id'])
            
        return {
            "status": "ok",
            "short_dates": shorts,
            "long_dates": longs
        }
    except Exception as e:
        print(f"History error: {e}")
        return {"status": "error", "message": str(e)}, 500

@app.route("/login",methods = ["POST"])
def login():
    data = request.get_json()
    db = dbClient()
    user = db.getCollection("Users").find_one({"email":data["email"]})
    if user:
        if user["password"] == data["password"]:
            user['_id'] = str(user['_id'])
            session['logged_user'] = user
            print(session['logged_user'])
            session.modified = True
            return {"status":"ok"}
        else:
            return {"status":"fail","message":"Password is incorrect"}
    return {"status":"fail","message":"Email is incorrect"}
@app.route("/register",methods = ["POST"])
def register():
    data = request.get_json()
    db = dbClient()
    try:
        #check if the email is already in the database
        if db.getCollection("Users").find_one({"email":data["email"]}):
            return {"status":"fail","message":"Email already exists"}
        db.getCollection("Users").insert_one({
            "email":data["email"],
            "password":data["password"]
        })
        
        # Automatically log in the user after registration
        user = db.getCollection("Users").find_one({"email": data["email"]})
        if user:
            user["_id"] = str(user["_id"])
            session['logged_user'] = user
            session.modified = True
        
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}

@app.route('/logout', methods=['GET'])
def logout():
    session.clear()
    return redirect(url_for('login_register'))

@app.route('/get_user_info', methods=['GET'])
def get_user_info():
    try:
        if 'logged_user' not in session:
            return {"status":"not_logged_in"}, 401
        
        information = session['logged_user']
        print(information)
        return information
    except Exception as e:
        print(f"Get user info error: {e}")
        return {"status":"not_logged_in"}, 401
@app.route('/update_user_info', methods=['POST'])
def update_user_info():
    if 'logged_user' not in session:
        abort(401,description="Unauthorized")
        #return {"status":"fail","message":"User not logged in"}
    form_data = request.form.to_dict()
    avatar = request.files.get('avatar')
    if avatar:
        avatar_path = os.path.join(app.config['UPLOAD_FOLDER'],'avatars', avatar.filename)
        avatar.save(avatar_path)
        form_data['avatar'] = os.path.join('static/avatars', avatar.filename)
    else:
        form_data['avatar'] = session['logged_user']['information']['avatar']
    db = dbClient()
    try:
        db.getCollection("Users").update_one({"_id":ObjectId(session['logged_user']['_id'])}, 
                                             {"$set":{"information": form_data}})
        session['logged_user']['information'] = form_data
        session.modified = True
        return {"status":"ok"}
    except:
        return {"status":"fail","message":"System Error"}


@app.route('/api/discovery/candidates', methods=['GET'])
def discovery_candidates():
    # In a real app, fetch from DB excluding current user
    # For MVP, we generate some interesting "Persona Agents"
    candidates = [
        {
            "id": "agent_001",
            "nickname": "Alex the Artist",
            "age": 26,
            "gender": "male",
            "occupation": "Digital Nomad / Illustrator",
            "bio": "I live in coffee shops and dream in pixels. Looking for a muse or just someone to critique my sketches.",
            "interests": "Sketching, Indie Coffee, Sci-Fi Novels",
            "avatar_color": "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)"
        },
        {
            "id": "agent_002",
            "nickname": "Sarah Start-up",
            "age": 29,
            "gender": "female",
            "occupation": "Tech Founder",
            "bio": "Married to my job but looking for a co-founder for life. Efficiency is my love language.",
            "interests": "Coding, Hiking, Angel Investing",
            "avatar_color": "linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)"
        },
        {
            "id": "agent_003",
            "nickname": "Zen Master Kai",
            "age": 32,
            "gender": "male",
            "occupation": "Yoga Instructor",
            "bio": "Just here to find balance. If your agent is too chaotic, we might not align.",
            "interests": "Meditation, Vegan Cooking, Surfing",
            "avatar_color": "linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)"
        },
        {
            "id": "agent_004",
            "nickname": "Chef Bella",
            "age": 27,
            "gender": "female",
            "occupation": "Pastry Chef",
            "bio": "Sweet but with a pinch of salt. I want to see if your agent can handle the heat in the kitchen.",
            "interests": "Baking, Travel, Food Photography",
            "avatar_color": "linear-gradient(120deg, #fa709a 0%, #fee140 100%)"
        }
    ]
    return {"status": "ok", "candidates": candidates}

@app.route('/api/hall/agents', methods=['GET'])
def hall_agents():
    """
    Get active agents for the Hall.
    Mix of real users and bots for density.
    """
    import random
    candidates = []
    
    # 1. Try to fetch real users (excluding self, and only those with proper profile)
    try:
        db = dbClient()
        current_user_id = None
        if 'logged_user' in session:
            current_user_id = session['logged_user']['_id']
            
        query = {}
        if current_user_id:
            query['_id'] = {'$ne': ObjectId(current_user_id)}
            
        real_users = list(db.getCollection("Users").find(query, {"password": 0}).limit(20))
        
        for user in real_users:
            info = user.get('information') or {}
            nickname = info.get('nickname', '').strip()
            # Skip users without a proper nickname
            if not nickname:
                continue
            # Skip test users (common test names)
            nickname_lower = nickname.lower()
            if nickname_lower in ['test', 'test user', 'testuser', 'user', 'guest', 'demo']:
                continue
            # Skip guest users in the hall list to keep focus on bots + real profiles
            if user.get('is_guest'):
                continue

            avatar = info.get('avatar', '')
            # Clean avatar path: if it's empty or default, set to empty string so frontend uses colored initial
            if avatar and avatar != 'default.png' and 'static/avatars/' in avatar:
                avatar = avatar.replace('static/avatars/', '')
            else:
                avatar = ''  # Empty = use colored initial circle

            candidates.append({
                "id": str(user['_id']),
                "name": nickname,
                "avatar": avatar,
                "gender": info.get('gender', 'neutral'),
                "bio": info.get('bio', 'Just browsing.'),
                "type": "real"
            })
    except Exception as e:
        print(f"Error fetching hall agents: {e}")
        
    # 2. Add Bots if not enough (Ensure at least 10 agents for a busy hall)
    # 一部分用真实照片，其它用彩色首字母头像（avatar 置空）
    bot_pool = [
        # With photo
        { "id": "bot_1", "name": "Elena", "avatar": "5bc44f2c589383ee6089a4e780bd.jpeg", "gender": "female", "bio": "Loves jazz and coffee.", "type": "bot" },
        { "id": "bot_2", "name": "Marcus", "avatar": "be4a4df66e47a38238e790be206d5c4.jpg", "gender": "male", "bio": "Chef and traveler.", "type": "bot" },
        { "id": "bot_3", "name": "Luna", "avatar": "d0a31e54-9d19-4c41-82dc-5bce0eb2eac9.png", "gender": "female", "bio": "Artist and dreamer.", "type": "bot" },
        { "id": "bot_4", "name": "Alex", "avatar": "ad02ffb259fd1c3255f94fa92255c1c.jpg", "gender": "male", "bio": "Tech enthusiast.", "type": "bot" },
        { "id": "bot_5", "name": "Sophia", "avatar": "990838cfdfef5631d48974231405ce4.jpg", "gender": "female", "bio": "Bookworm.", "type": "bot" },
        # Colored initial avatars (no photo file)
        { "id": "bot_6", "name": "Priya", "avatar": "", "gender": "female", "bio": "Lawyer with a passion for debate and fine wine.", "type": "bot" },
        { "id": "bot_7", "name": "James", "avatar": "", "gender": "male", "bio": "Data Scientist. I see patterns in everything, including love.", "type": "bot" },
        { "id": "bot_8", "name": "Zoe", "avatar": "", "gender": "female", "bio": "Marine Biologist. Happiest underwater.", "type": "bot" },
        { "id": "bot_9", "name": "Liam", "avatar": "", "gender": "male", "bio": "Musician. Let's make sweet harmony together.", "type": "bot" },
        { "id": "bot_10", "name": "Ravi", "avatar": "", "gender": "male", "bio": "Architect. Building foundations for a lasting relationship.", "type": "bot" },
        { "id": "bot_11", "name": "Mei", "avatar": "", "gender": "female", "bio": "Tea sommelier. Life is too short for bad tea.", "type": "bot" },
        { "id": "bot_12", "name": "Oliver", "avatar": "", "gender": "male", "bio": "Startup founder. Building the future, one bug at a time.", "type": "bot" },
        { "id": "bot_13", "name": "Ava", "avatar": "", "gender": "female", "bio": "Yoga instructor. Namaste in bed.", "type": "bot" },
        { "id": "bot_14", "name": "Ethan", "avatar": "", "gender": "male", "bio": "Adventure photographer. Will travel for sunsets.", "type": "bot" },
        { "id": "bot_15", "name": "Isabella", "avatar": "", "gender": "female", "bio": "Wine enthusiast. Grape expectations.", "type": "bot" }
    ]
    
    # Add bots to fill up to 10 agents
    if len(candidates) < 10:
        needed = 10 - len(candidates)
        random.shuffle(bot_pool)
        candidates.extend(bot_pool[:needed])
        
    return {"status": "ok", "agents": candidates}

@app.route('/api/hall/check_interest', methods=['POST'])
def hall_check_interest():
    """
    Determine if a spark happens between two agents.
    Returns a short generated dialogue.
    """
    data = request.get_json()
    target_id = data.get('target_id')
    
    # For MVP, simple random check + static generated dialogue
    # In future, use LLM here based on profiles
    
    # Mock Dialogue Generator
    import random
    
    dialogues = [
        [
            {"speaker": "Me", "text": "Hi! I love your vibe."},
            {"speaker": "Partner", "text": "Thanks! I was just thinking about getting some coffee."},
            {"speaker": "Me", "text": "Oh, I know a great place nearby. Do you like dark roasts?"},
            {"speaker": "Partner", "text": "Absolutely. Lead the way!"}
        ],
        [
            {"speaker": "Me", "text": "Is that a vintage camera?"},
            {"speaker": "Partner", "text": "Good eye! Yes, I love film photography."},
            {"speaker": "Me", "text": "That's so cool. I've been trying to get into it."},
            {"speaker": "Partner", "text": "I can show you the basics sometime."}
        ],
        [
            {"speaker": "Me", "text": "Hey, you look deep in thought."},
            {"speaker": "Partner", "text": "Just pondering the meaning of... pizza toppings."},
            {"speaker": "Me", "text": "Controversial topic. Pineapple or no?"},
            {"speaker": "Partner", "text": "Definitely yes. Don't judge me!"}
        ],
        [
            {"speaker": "Me", "text": "I noticed you from across the room."},
            {"speaker": "Partner", "text": "Oh really? What caught your attention?"},
            {"speaker": "Me", "text": "Your smile. It's contagious."},
            {"speaker": "Partner", "text": "Well, now you've made me smile even more!"}
        ],
        [
            {"speaker": "Me", "text": "What brings you here tonight?"},
            {"speaker": "Partner", "text": "Looking for interesting conversations. Found one?"},
            {"speaker": "Me", "text": "I think so. What's the most interesting thing about you?"},
            {"speaker": "Partner", "text": "I collect vintage maps. Weird, I know."}
        ]
    ]
    
    selected_dialogue = random.choice(dialogues)
    
    # Save Short Interaction History
    try:
        if 'logged_user' in session:
            user_id = session['logged_user']['_id']
            db = dbClient()
            db.getCollection("short-interactions").insert_one({
                "user_id": user_id,
                "target_id": target_id,
                "timestamp": str(ObjectId()),
                "dialogue": selected_dialogue,
                "status": "sparked"
            })
    except Exception as e:
        print(f"Failed to save short interaction: {e}")
    
    return {
        "status": "ok", 
        "interested": True, 
        "dialogue": selected_dialogue
    }

# Discovery API: Real-time Agent Echo
@app.route('/api/agent/echo', methods=['POST'])
def agent_echo():
    try:
        data = request.get_json()
        user_input = data.get('input', '')
        agent_info = data.get('agent', {})
        
        if not user_input or not agent_info:
            return jsonify({"status": "error", "message": "Missing input"}), 400
            
        # Construct a lightweight persona prompt
        name = agent_info.get('name', 'Stranger')
        age = agent_info.get('age', 'unknown')
        occupation = agent_info.get('role', 'unknown')
        bio = agent_info.get('bio', '')
        
        system_prompt = f"""
        You are playing the role of {name}, a {age}-year-old {occupation}.
        Your bio: "{bio}"
        
        A user has just shouted into the void: "{user_input}"
        
        Reply with a SHORT, intriguing sentence (max 15 words).
        Reflect your persona. If the user is sad, be comforting. If happy, be playful.
        Do NOT be formal. Be human-like and conversational.
        """
        
        # Initialize Agent (using our utils)
        agent = Agent(system_prompt, name)
        
        # Get response (blocking for now, could be async in production)
        # We use a special flag or method if needed, but sendMessage works
        response = agent.sendMessage(user_input)
        
        # Clean up response (remove quotes if any)
        response = response.strip('"')
        
        return jsonify({"status": "ok", "reply": response})
        
    except Exception as e:
        print(f"Echo Error: {e}")
        # Fallback mock response if LLM fails
        return jsonify({"status": "ok", "reply": "I feel that too."})

# =========================================
# DISCOVERY API - REAL LLM RESONANCE
# =========================================
@app.route('/api/soul_resonance', methods=['POST'])
def soul_resonance():
    data = request.get_json()
    user_input = data.get('input', '')
    agent_persona = data.get('agent', {})
    
    if not user_input or not agent_persona:
        return jsonify({"response": "..."})
        
    # Extract persona details
    name = agent_persona.get('name', 'Someone')
    role = agent_persona.get('role', 'a person')
    bio = agent_persona.get('bio', '')
    age = agent_persona.get('age', 25)
    
    # Build a realistic, conversational prompt
    system_prompt = f"""You are {name}, {age} years old, working as {role}.
About you: {bio}

You are on a dating app. Someone just sent you this message: "{user_input}"

Reply as {name} would naturally reply - be yourself, be genuine, and show your personality.
Keep your response SHORT (1-2 sentences max, under 20 words).
Don't be formal or robotic. Be warm, curious, or playful depending on your personality.
If the message resonates with your interests, show enthusiasm.
If it doesn't match your vibe, be politely neutral.

Reply directly without quotes or explanation:"""
    
    try:
        bot = Agent(system_prompt, name)
        reply = bot.sendMessage(user_input)
        
        # Clean up response
        reply = reply.strip('"').strip("'").strip()
        # Truncate if too long
        if len(reply) > 100:
            reply = reply[:97] + "..."
            
        return jsonify({"response": reply})
    except Exception as e:
        print(f"Resonance Error: {e}")
        # Fallback based on personality keywords
        fallbacks = [
            f"Hey! That's interesting 😊",
            f"I like that energy!",
            f"Tell me more?",
            f"Sounds fun!",
            f"I'm curious now..."
        ]
        import random
        return jsonify({"response": random.choice(fallbacks)})


if __name__ == "__main__":
    # Use PORT from environment for PaaS (Render / Railway / etc.), default to 5001 for local dev.
    # allow_unsafe_werkzeug=True 避免 Flask 3 + Werkzeug 3 在生产环境禁止内置服务器。
    port = int(os.environ.get("PORT", 5001))
    socketio.run(
        app,
        debug=True,
        port=port,
        host="0.0.0.0",
        allow_unsafe_werkzeug=True,
    )

