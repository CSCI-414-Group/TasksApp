from flask import Flask, request, render_template, redirect, url_for, jsonify, flash, session  
import hashlib
import psycopg2
import uuid
from flask_pymongo import PyMongo
from pymongo import MongoClient
from functools import wraps
from flask import jsonify
from werkzeug.utils import secure_filename
from bson.objectid import ObjectId

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'  # You can choose other options like 'redis' or 'sqlalchemy'
app.secret_key = str(uuid.uuid4())  # Replace with a secure secret key
app.config['TESTING'] = False

#postgre sql setup

db_config = {
    'dbname': 'TaskManagement',
    'user': 'postgres',
    'password': 'shaheen1',
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

    cur.execute("SELECT user_id, username, password FROM users WHERE username = %s", (email,))
    result = cur.fetchone()

    if result is not None:
        user_id, username, stored_password_hash = result
        conn.close()

        if stored_password_hash == hashPassword(password):
            session['userId'] = user_id
            session['userName'] = username
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
    return render_template('index.html', username=session.get('userName'))

@app.route('/addFolder', methods=['POST'])
@login_required
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
@login_required
def addTaskToFolder():
    try:
        data = request.get_json()
        folder_name = data.get('folderName')
        task_name = data.get('taskName')
        task_status = data.get('status')
        image_data = data.get('imageData')
        filename = data.get('fileName')

        userId = session.get('userId')
        user_document = tasks.find_one({'userId': userId})
        folder_to_update = None

        if user_document is None:
            return jsonify({"message": "User not found."}), 404

        for folder in user_document.get('folders', []):
            if folder['name'] == folder_name:
                folder_to_update = folder
                break

        if folder_to_update is None:
            return jsonify({"message": "Folder not found."}), 404

        task_data = {
            'name': task_name,
            'status': task_status,
        }
        if image_data:
            task_data['imageFileName'] = filename
            task_data['imageFileData'] = image_data


        folder_to_update['tasks'].append(task_data)
        tasks.update_one({'userId': userId}, {'$set': {'folders': user_document['folders']}})
        return jsonify({"message": "task added successfully!", "success":True})

    except Exception as e:
        return jsonify({"message": "An error occurred: " + str(e)}), 500


@app.route('/getFolderTask', methods=['GET'])
@login_required
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
                     
                    tasks_with_images.append({
                        'name': task['name'],
                        'status': task['status'],
                        'imageFileName': image_file_name,
                        'imageFileData': image_data  # Now it's a string
                    })  
                else:
                    tasks_with_images.append(task)

            return jsonify({"folders": tasks_with_images})
        else:
            return jsonify({"error": "User not found"}), 404
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/getFolders', methods=['GET'])
@login_required
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
@login_required
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
    
@app.route('/update', methods=['POST'])
@login_required
def update():
    try:

        data = request.get_json()
        folder_name = data.get('folderName')
        old_task_name = data.get('oldTaskName')
        new_task_name = data.get('newTaskName')
        new_task_status = data.get('newTaskStatus')
        new_image = data.get('newImage')
        filename = data.get('fileName')
        isRemovFile = data.get('removeImage')
        user_id = session.get('userId')  # Get the user's ID

        newTaskDocument = {
            'name': None,
            'status': None,
            'imageFileName': None,
            'imageFileData': None
        }

        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})
        if user_document:
            for folder in user_document['folders']:
                if folder['name'] == folder_name:
                    for task in folder['tasks']:
                        if task['name'] == old_task_name:
                            # Update task details
                            task['name'] = new_task_name
                            task['status'] = new_task_status

                            # Check if an image update or removal is requested
                            if filename and not isRemovFile:
                                task['imageFileName'] = filename
                                task['imageFileData'] = new_image
                                newTaskDocument['imageFileName'] = task.get('imageFileName')
                                newTaskDocument['imageFileData'] = task.get('imageFileData')
                            elif isRemovFile:
                                # Remove image details if image removal is requested
                                task.pop('imageFileName', None)
                                task.pop('imageFileData', None)

                            newTaskDocument['name'] = task['name']
                            newTaskDocument['status'] = task['status']

                            # Update the user's document in the database
                            tasks.update_one({'userId': user_id}, {'$set': user_document})
                            return jsonify({"updated_data": newTaskDocument})

        return jsonify({"error": "Task not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# removing/deleting tasks function from folder
@app.route('/removeTask', methods=['POST'])
@login_required
def remove_task():
    try:
        data = request.get_json()
        folder_name = data.get('folderName')
        task_name = data.get('taskName')
        user_id = session.get('userId')  # Get the user's ID

        # Find the user's document by user_id
        user_document = tasks.find_one({'userId': user_id})

        if user_document:
            # Find the folder by name
            folder_to_update = None
            for folder in user_document['folders']:
                if folder['name'] == folder_name:
                    folder_to_update = folder
                    break

            # Remove the specified task from the folder
            updated_tasks = [task for task in folder_to_update['tasks'] if task['name'] != task_name]
            folder_to_update['tasks'] = updated_tasks

            # Update the user document in the database
            tasks.update_one({'userId': user_id}, {'$set': {'folders': user_document['folders']}})

            return jsonify({"success": True})
        else:
            return jsonify({"error": "User not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/editFolder', methods=['POST'])
@login_required
def edit_folder():
    try:
        # Get data from the request
        user_id = session.get('userId')  # Get the user's ID
        old_folder_name = request.json.get('old_folder_name')
        new_folder_name = request.json.get('new_folder_name')

        user_document = tasks.find_one({'userId': user_id})
        if not user_document:
            return jsonify({"success": False, "error": "User not found"})
        
        result = tasks.update_one(
            {
                'userId': user_id,
                "folders.name": old_folder_name
            },
            {
                "$set": {
                    "folders.$.name": new_folder_name
                }
            }
        )

        if result.matched_count == 1 and result.modified_count == 1:
            return jsonify({"success": True, "message": "Folder name updated successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to update folder name"})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/checkFolderExistence', methods=['POST'])
@login_required
def check_folder_existence():
    try:
        # Get request data
        data = request.get_json()
        folder_name = data.get('folderName')
        user_id = session.get('userId')  # Get the user's ID

        if not folder_name or not user_id:
            return jsonify({"message": "Invalid input", "exists": False}), 400

        user = tasks.find_one({"userId": user_id})  # assuming your collection name is 'users'

        if not user:
            return jsonify({"message": "User not found", "exists": False}), 404

        # Check if folder exists
        folder_exists = any(folder['name'] == folder_name for folder in user['folders'])
    
        return jsonify({"message": "Success", "exists": folder_exists}), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}", "exists": False}), 500

@app.route('/checkTaskExistence', methods=['POST'])
@login_required
def check_task_existence():
    try:
        # Get request data
        data = request.get_json()
        task_name = data.get('taskName')
        folder_name = data.get('folderName')
        user_id = session.get('userId')  # Get the user's ID

        if not task_name or not folder_name or not user_id:
            return jsonify({"message": "Invalid input", "exists": False}), 400

        user = tasks.find_one({"userId": user_id})  # assuming your collection name is 'users'

        if not user:
            return jsonify({"message": "User not found", "exists": False}), 404

        folder = next((f for f in user['folders'] if f['name'] == folder_name), None)

        if folder is None:
            return jsonify({"message": "Folder not found", "exists": False}), 404

        # Check if task exists in the folder
        task_exists = any(task['name'] == task_name for task in folder['tasks'])

        return jsonify({"message": "Success", "exists": task_exists}), 200

    except Exception as e:
        return jsonify({"message": f"An error occurred: {str(e)}", "exists": False}), 500

if __name__ == '__main__':
    app.run(debug=True)
