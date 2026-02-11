if __name__ == "__main__":
    from backend.routes import routes
    
    from backend.database import db

    from backend.models import *

    from flask import Flask
    from flask_cors import CORS
    
    app = Flask(__name__)
    app.register_blueprint(routes)
    CORS(app)

    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///your_database_name.db'
    db.init_app(app)
   

    with app.app_context():
        db.create_all()

    app.run(debug=True, port=5002)
