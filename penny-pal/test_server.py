from flask import Flask
app = Flask(__name__)

@app.route('/')
def home():
    return "Server is running!"

@app.route('/api/health')
def health():
    return {"status": "OK"}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)