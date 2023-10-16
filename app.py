from flask import Flask, request, render_template, redirect, url_for, jsonify, flash, session  
import psycopg2
import hashlib
import os
import uuid
from flask_pymongo import PyMongo
from pymongo import MongoClient
from flask import Flask, render_template
from functools import wraps


app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'  # You can choose other options like 'redis' or 'sqlalchemy'
app.secret_key = str(uuid.uuid4())  # Replace with a secure secret key
app.config['TESTING'] = False


db_config = {
    'dbname': 'TaskManagement',
    'user': 'postgres',
    'password': 'shaheen1',
    'host': 'localhost',
    'port': '5432'
}

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

@app.route('/create_account', methods=['POST'])
def createAccount():

    email = request.form['email']
    password = request.form['password']

    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()

    hashedPass=hashPassword(password)

    cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (email, hashedPass))
            
    conn.commit()
    conn.close()
  
    flash('Account created successfully! You can now log in.', 'success')

    return redirect('/loginView') 

@app.route("/check_email", methods=["POST"])
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


if __name__ == '__main__':
    app.run(debug=True)