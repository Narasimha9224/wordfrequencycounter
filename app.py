from flask import Flask, request, jsonify
from collections import Counter
import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from flask_cors import CORS

app = Flask(__name__, static_folder='static')
CORS(app)

# Download necessary NLTK data
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_text():
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400
    
    text = data['text']
    remove_stopwords = data.get('removeStopwords', False)
    case_sensitive = data.get('caseSensitive', False)
    
    # Process the text
    if not case_sensitive:
        text = text.lower()
    
    # Remove punctuation and tokenize
    text = re.sub(r'[^\w\s]', ' ', text)
    words = word_tokenize(text)
    
    # Remove stopwords if requested
    if remove_stopwords:
        stop_words = set(stopwords.words('english'))
        words = [word for word in words if word not in stop_words]
    
    # Count word frequencies
    word_counts = Counter(words)
    
    # Convert to list of dictionaries for JSON response
    result = [{'word': word, 'count': count} for word, count in word_counts.most_common(100)]
    
    return jsonify({
        'wordCount': len(words),
        'uniqueWords': len(word_counts),
        'frequencies': result
    })

if __name__ == '__main__':
    app.run(debug=True)