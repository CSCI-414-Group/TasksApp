from flask import Flask, request, render_template, redirect, url_for, jsonify, flash, session 
import secrets 
import psycopg2
import hashlib
import os
from flask_pymongo import PyMongo
from pymongo import MongoClient


from flask import Flask, render_template

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

db_config = {
    'dbname': 'Project1',
    'user': 'postgres',
    'password': 'TryMe@2020$',
    'host': 'localhost',
    'port': '5432'
}

def hashPassword(password):
    salt = "esfe3432432432fdsf"
    iterations = 100000
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    return password_hash

def email_exists(email):
    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE username = %s", (email,))
    result = cur.fetchone()
    conn.close()
    return result[0] > 0

@app.route("/check_email", methods=["POST"])
def check_email():
    data = request.get_json()
    email = data.get("email")

    # Use your email_exists function to check if the email exists in the database
    email_exists_result = email_exists(email)

    return jsonify({"exists": email_exists_result})

@app.route('/', methods=['GET', 'POST'])
def create():
    return render_template('Create.html')

# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     return render_template('Login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()

        cur.execute("SELECT password FROM users WHERE username = %s", (email,))
        stored_password_hash = cur.fetchone()
        
        conn.close()

        if stored_password_hash and stored_password_hash[0] == hashPassword(password):
            # Authentication successful, set session variables and redirect to tasks page
            session['logged_in'] = True
            session['email'] = email
            # conn.close()
            return redirect('/tasks')
        else:
            flash('Invalid email or password. Please try again.', 'error')
            # conn.close()

    return render_template('Login.html')

 
@app.route('/tasks',  methods=['GET', 'POST'])
def getTasks():
    return render_template('index.html')



@app.route('/create_account', methods=['POST'])
def createAccount():

    email = request.form['email']
    password = request.form['password']

    conn = psycopg2.connect(**db_config)
    cur = conn.cursor()

    cur.execute("INSERT INTO users (username, password) VALUES (%s, %s)", (email, hashPassword(password)))
            
    conn.commit()
    conn.close()

    return redirect('/tasks') 


if __name__ == '__main__':
    app.run(debug=True)