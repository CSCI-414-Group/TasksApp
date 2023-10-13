from flask import Flask, jsonify, render_template, request
import sqlite3
from flask_pymongo import PyMongo
from pymongo import MongoClient

from flask import Flask, render_template

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def create():
    return render_template('Create.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    return render_template('Login.html')

if __name__ == '__main__':
    app.run(debug=True)