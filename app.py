from flask import Flask, jsonify, render_template, request
import sqlite3
from flask_pymongo import PyMongo
from pymongo import MongoClient

app = Flask(__name__)

client = MongoClient("mongodb://localhost:27017/") #connect to ur mongodb url
db = client.User 
users = db.users


# Define the path to your SQLite database file
DATABASE = 'db/book.db'

@app.route('/api/books', methods=['GET'])
#def do_something():



# Route to render the index.html page
@app.route('/')
def index():
    users.insert_one({"name":"james","age":14})
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0")
