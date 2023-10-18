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
from flask import jsonify
import base64
from PIL import Image
import io
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'  # You can choose other options like 'redis' or 'sqlalchemy'
app.secret_key = str(uuid.uuid4())  # Replace with a secure secret key
app.config['TESTING'] = False

UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

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
    if request.method == 'POST':

        folder_name = request.form['folder_name']
        task_name = request.form['task_name']
        task_status = request.form['status']
        file = request.files['image']
        userId = session.get('userId')
        user_document = tasks.find_one({'userId': userId})
        folder_to_update = None
        for folder in user_document['folders']:
            if folder['name'] == folder_name:
                folder_to_update = folder
                break
    
        task_data = {
            'name': task_name,
            'status': task_status,
        }
        if file:
            task_data['imageFileName'] = file.filename
            # Save the image to the 'uploads' folder
            filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filename)
            # Save image data to MongoDB
            with open(filename, 'rb') as image_file:
                image_data = image_file.read()
            task_data['imageFileData'] = image_data
            os.remove(filename) 
             
        folder_to_update['tasks'].append(task_data)
        tasks.update_one({'userId': userId}, {'$set': {'folders': user_document['folders']}})  
    return redirect(url_for('getTasks'))

@app.route('/getFolderTask', methods=['GET'])
def getAllTasks():
    try:
        folder_name = request.args.get('folder_name')

        user_id = session.get('userId')

        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})

        if user_document:
            tasks_with_images = []
            folderToList = None
            for folder in user_document['folders']:
                if folder['name'] == folder_name:
                    folderToList = folder
                    break
        
            for task in folderToList['tasks']:
                if 'imageFileName' in task and 'imageFileData' in task:
                    image_file_name = task['imageFileName']
                    image_data = task['imageFileData']
                    image_data_base64 = base64.b64encode(image_data).decode('utf-8')
                     
                    tasks_with_images.append({
                        'name': task['name'],
                        'status': task['status'],
                        'imageFileName': image_file_name,
                        'imageFileData': image_data_base64  # Now it's a string
                    })  
                else:
                    tasks_with_images.append(task)

            return jsonify({"folders": tasks_with_images})
        else:
            return jsonify({"error": "User not found"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/removeFolder', methods=['POST'])
def remove_folder():
    try:
        folder_name = request.json.get('folderName')
        user_id = session.get('userId')  # Get the user's ID

        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})

        if user_document:
            updated_folders = [folder for folder in user_document['folders'] if folder['name'] != folder_name]

            # Update the user document to remove the specified folder
            tasks.update_one({'userId': user_id}, {'$set': {'folders': updated_folders}})

            return jsonify({"success": True})
        else:
            return jsonify({"error": "User not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
if __name__ == '__main__':
    app.run(debug=True)
