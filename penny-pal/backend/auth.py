from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import User
import firebase_admin
from firebase_admin import auth, credentials
from flask import request
from firebase_admin import auth as firebase_auth
from backend.models import User
from backend.database import db



cred = credentials.Certificate("backend/pennypal-85c2e-firebase-adminsdk-fbsvc-c513376ba8.json")
firebase_admin.initialize_app(cred)

def hash_password(password):
    return generate_password_hash(password)

def verify_password(password, hash):
    return check_password_hash(hash, password)

def authenticate(username, password):
    user = User.query.filter_by(username=username).first()
    if user and verify_password(password, user.passowrd_hash):
        return user
    return None

def get_user_from_token():

    auth_header = request.headers.get('Authorization')

    if not auth_header:
        print("No Authorization header")
        
        return None

    try:
        token = auth_header.split(" ")[1]
        decoded = firebase_auth.verify_id_token(token)

        email = decoded['email']
        username = email.split('@')[0]

        user = User.query.filter_by(email=email).first()

        if not email:
            print("no email found in decoded token")
            return None

        # Auto-create user if not found
        if not user:
            user = User(username=username, email=email, password_hash="firebase")
            db.session.add(user)
            db.session.commit()
            print(f"Created new user for {email}")

        return user

    except Exception as e:
        print("Token verification or user creation failed:", str(e))
        return None


