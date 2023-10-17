from flask import Flask, request, render_template, redirect, url_for, jsonify, flash, session  
import psycopg2
import hashlib
import os
import uuid
from flask_pymongo import PyMongo
from pymongo import MongoClient
from flask import Flask, render_template
from functools import wraps
from bson import ObjectId
from bson import Binary
import base64

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'  # You can choose other options like 'redis' or 'sqlalchemy'
app.secret_key = str(uuid.uuid4())  # Replace with a secure secret key
app.config['TESTING'] = False

#postgre sql setup
db_config = {
    'dbname': 'Project1',
    'user': 'postgres',
    'password': 'TryMe@2020$',
    'host': 'localhost',
    'port': '5432'
}

#mongo setup
client = MongoClient("mongodb://localhost:27017/")  
app.config["MONGO_URI"] = "mongodb://localhost:27017"
db = PyMongo(app)


client = MongoClient("mongodb://localhost:27017/")
db = client.TaskSystem
tasks = db.tasks


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get('userId') is None:
            return redirect('/loginView',code=302)
        return f(*args, **kwargs)
    return decorated_function

def hashPassword(password):
    sha256_hash = hashlib.sha256()
    sha256_hash.update(password.encode('utf-8'))
    hash_result = sha256_hash.hexdigest()
    return hash_result

def email_exists(email):

    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE username = %s", (email,))
    result = cur.fetchone()
    conn.close()
    return result[0] > 0

@app.route('/', methods=['GET', 'POST'])
def create():
    return render_template('Create.html')

@app.route('/loginView', methods=['GET', 'POST'])
def loginView():    
    return render_template('Login.html')

@app.route('/login', methods=['POST'])
def login_post():
    email = request.form['email']
    password = request.form['password']

    # You can add your authentication logic here
    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()

    cur.execute("SELECT user_id, password FROM users WHERE username = %s", (email,))
    result = cur.fetchone()

    if result is not None:
        user_id, stored_password_hash = result
        conn.close()

        if stored_password_hash == hashPassword(password):
            session['userId'] = user_id
            print(f"Username in session:{session.get('userId')}")
            return redirect("/tasks")
        else:
            flash('Incorrect password or username. Please try again.', 'error')
            return redirect("/loginView")
    else:
        flash('Incorrect password or username. Please try again.', 'error')
        return redirect("/loginView")

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/loginView')

@app.route('/create_account', methods=['POST'])
def createAccount():

    try:
        email = request.form['email']
        password = request.form['password']

        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()

        hashedPass=hashPassword(password)

        cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (email, hashedPass))   
        conn.commit()

        cur.execute("SELECT user_id FROM users WHERE username = %s", (email,))
        result = cur.fetchone()

        conn.close()

        user_doc = {
            "userId": result[0],
            "folders":[]
        }
        result = tasks.insert_one(user_doc)
        flash('Account created successfully! You can now log in.', 'success')
        return redirect('/loginView') 
    
    except Exception as e:
        flash(f'Account creation failed: {str(e)}', 'error')
        return redirect('/create_account')

@app.route("/checkEmail", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email")

    # Use your email_exists function to check if the email exists in the database
    email_exists_result = email_exists(email)

    return jsonify({"exists": email_exists_result})

@app.route('/tasks',  methods=['GET', 'POST'])
@login_required
def getTasks():
    return render_template('index.html')
  
@app.route('/addFolder', methods=['POST'])
def add_folder():
    try:
        data = request.get_json() 
        folder_name = data.get("folderName")
        new_folder = {
            "name": folder_name,
            "tasks": []
        }
        user_id = session.get('userId')
        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})

        if user_document:
            # Add the new folder to the user's "folders" array
            user_document['folders'].append(new_folder)

            # Update the user's document in the database
            tasks.update_one({'userId': user_id}, {"$set": user_document})

            return jsonify({"message": "Folder added successfully!"}), 200
        else:
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/addTaskToFolder', methods=['POST'])
def addTaskToFolder():
    try:
        user_id = session.get('userId')
        folder_name = request.json.get('folder_name')
        task_name = request.json.get('task_name')
        task_status = request.json.get('task_status')
        task_image = request.json.get('task_image')

        if not user_id or not folder_name or not task_name or not task_status:
            return jsonify({'error': 'Missing required parameters: user_id, folder_name, task_name, task_status'}), 400

       

        user_document = tasks.find_one({'userId': user_id})

        if not user_document:
            return jsonify({'error': 'User not found'}), 404

        folder_to_update = None
        for folder in user_document['folders']:
            if folder['name'] == folder_name:
                folder_to_update = folder
                break

        if folder_to_update is None:
            return jsonify({'error': 'Folder not found'}), 404

        if task_image:
            # Read and encode the binary data of the image
            image_data = task_image.read()
            imageBinary = Binary(image_data)


        new_task = {
            'title': task_name,
            'status': task_status,
            'image': task_image,
            'image_data': imageBinary
        }
        
        folder_to_update['tasks'].append(new_task)

        tasks.update_one({'userId': user_id}, {'$set': {'folders': folder_to_update}})

        return jsonify({'message': 'Task added successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/getFolders', methods=['GET'])
def list_folders():
    try:
        user_id = session.get('userId')

        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})

        if user_document:
            folders = user_document.get('folders', [])

            # Extract just the folder names
            folder_names = [folder['name'] for folder in folders]

            return jsonify({"folder_names": folder_names})
        else:
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)