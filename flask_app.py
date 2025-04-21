from flask import Flask, request, jsonify
import cv2
from flask_cors import CORS
import os
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import img_to_array
import numpy as np
from PIL import Image
import pandas as pd
from music_recommender import (
    NumpyEncoder, load_data, recommend_by_mood, recommend_by_activity, random_recommendations, search_songs,
    get_song_analysis, find_obscure_songs, find_similar_songs
)

# load the emotion detection model
try:
    emotion_model = load_model('C:\\Users\\syedn\\Melodex\\Melodex-Recommendation-System\\venv\\Models\\facial_expression_model_4emotions_continued.keras')

    # define emotion labels 
    EMOTION_LABELS = ['Angry', 'Fear', 'Happy', 'Sad']
except Exception as e:
    print(f"Error loading emotion model: {e}")
    emotion_model = None

app = Flask(__name__)
CORS(app)

# configure Flask to use custom JSON encoder
app.json_encoder = NumpyEncoder

# configure allowed file extensions and upload folder
UPLOAD_FOLDER = 'temp_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

try:
    DATASET_PATH = 'C:\\Users\\syedn\\Melodex\\Melodex-Recommendation-System\\venv\\songs_dataset.csv'
    music_data = load_data(DATASET_PATH)
    music_data =  music_data.drop_duplicates(subset=['track_name', 'artists'])
except:
    DATASET_PATH = 'songs_dataset.csv'
    try:
        music_data = load_data(DATASET_PATH)
        music_data =  music_data.drop_duplicates(subset=['track_name', 'artists'])
    except:
        # Create a placeholder dataset if both paths fail
        print("Warning: Could not load dataset. Creating a sample dataset.")
        import numpy as np
        music_data = pd.DataFrame({
            'track_id': [f'sample{i}' for i in range(10)],
            'track_name': [f'Sample Track {i}' for i in range(10)],
            'album_name': [f'Sample Album {i // 2}' for i in range(10)],
            'artists': [f'Sample Artist {i // 3}' for i in range(10)],
            'track_genre': np.random.choice(['pop', 'rock', 'jazz', 'hip-hop', 'classical'], 10),
            'popularity': np.random.randint(1, 100, 10),
            'duration_ms': np.random.randint(120000, 300000, 10)
        })


@app.route('/api/random', methods=['GET'])
def random_music_items():
    item_type = request.args.get('item_type', 'song')
    genre = request.args.get('genre', None)
    count = int(request.args.get('count', 1))

    if item_type not in ['song', 'album', 'artist', 'playlist']:
        return jsonify(
            {'success': False, 'error': 'Invalid item type. Must be one of: song, album, artist, playlist'}), 400

    try:
        results = random_recommendations(music_data, item_type, genre, count)

        if isinstance(results, dict) and 'error' in results:
            return jsonify({'success': False, 'error': results['error']}), 404

        return jsonify({
            'success': True,
            'items': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_for_songs():
    query = request.args.get('query', '')

    if not query or len(query) < 2:
        return jsonify({
            'success': True,
            'results': []
        })

    try:
        results = search_songs(music_data, query)
        return jsonify({
            'success': True,
            'results': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/analyse', methods=['GET'])
def analyse_song():
    track_id = request.args.get('track_id', '')

    if not track_id:
        return jsonify({'success': False, 'error': 'Track ID is required'}), 400

    try:
        analysis = get_song_analysis(music_data, track_id)

        if isinstance(analysis, dict) and 'error' in analysis:
            return jsonify({'success': False, 'error': analysis['error']}), 404

        return jsonify({
            'success': True,
            'analysis': analysis
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/obscure', methods=['GET'])
def obscure_songs():
    genre = request.args.get('genre', None)
    popularity_threshold = int(request.args.get('popularity_threshold', 30))
    count = int(request.args.get('count', 5))

    try:
        results = find_obscure_songs(music_data, genre, popularity_threshold, count)

        if isinstance(results, dict) and 'error' in results:
            return jsonify({'success': False, 'error': results['error']}), 404

        return jsonify({
            'success': True,
            'songs': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/similar', methods=['GET'])
def similar_songst():
    track_id = request.args.get('track_id', '')
    count = request.args.get('count', 5, type=int)

    if not track_id:
        return jsonify({'success': False, 'error': 'Track ID is required'}), 400

    try:
        similar_songs = find_similar_songs(music_data, track_id, count)
        if isinstance(similar_songs, dict) and 'error' in similar_songs:
            return jsonify({'success': False, 'error': similar_songs['error']}), 404

        return jsonify({
            'success': True,
            'similar_songs': similar_songs
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/genres', methods=['GET'])
def get_genres():
    try:
        if isinstance(music_data, pd.DataFrame) and 'track_genre' in music_data.columns:
            genres = sorted(music_data['track_genre'].unique().tolist())
            return jsonify({
                'success': True,
                'genres': genres
            })
        else:
            default_genres = ['pop', 'rock', 'hip-hop', 'jazz', 'classical', 'electronic', 'country', 'r&b', 'folk']
            return jsonify({
                'success': True,
                'genres': default_genres
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/activities', methods=['GET'])
def get_activities():
    activities = [
        'workout', 'studying', 'relaxing', 'party',
        'commuting', 'meditation', 'cooking'
    ]
    return jsonify({
        'success': True,
        'activities': activities
    })

@app.route('/api/moods', methods=['GET'])
def get_moods():
    moods = [
        'angry', 'happy', 'frightened', 'sad',
        'chill'
    ]
    return jsonify({
        'success': True,
        'moods': moods
    })


@app.route('/api/activity-recommend', methods=['GET'])
def activity_recommendation():
 
    activity = request.args.get('activity', ' ')
    item_type = request.args.get('item_type', 'song')
    count = int(request.args.get('count', 5))


    if not activity:
        return jsonify({'success': False, 'error': 'Activity is required'}), 400

    try:
        results = recommend_by_activity(music_data, activity, item_type, count)


        if isinstance(results, dict) and 'error' in results:
            return jsonify({'success': False, 'error': results['error']}), 400

        return jsonify({
            'success': True,
            'items': results
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/mood-recommend', methods=['POST'])
def mood_recommendation():
    
    input_method = request.form.get('input_method', 'text')
    item_type = request.form.get('item_type', 'song')
    count = int(request.form.get('count', 5))
    genre = request.form.get('genre', None)  

    # mood determination variables 
    detected_mood = None
    detection_confidence = None

    # If a photo is uploaded
    if input_method == 'photo' and 'mood_photo' in request.files:
        # ensure the model is loaded first before proceeding
        if emotion_model is None:
            return jsonify({
                'success': False,
                'error': 'Emotion detection model failed to load'
            }), 500

        try:
            # get the photo
            mood_photo = request.files['mood_photo']

            # Use OpenCV for face detection and preprocessing

            # read the image 
            img_array = np.frombuffer(mood_photo.read(), np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

            # convert to grayscale for face detection (model was trained on grayscale images)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # load the haarcascade face detector from cv2
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

            # detect face(s)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

            # if no faces detected then send an error
            if len(faces) == 0:
                return jsonify({
                    'success': False,
                    'error': 'No face detected in the image'
                }), 400

            # take the first detected face, if multiple rest are ignored
            (x, y, w, h) = faces[0]

            # get face ROI
            face_roi = gray[y:y + h, x:x + w]

            # resize it for the model (the images it was trained on are 48x48)
            face_roi = cv2.resize(face_roi, (48, 48))

            # normalisation
            face_roi = face_roi / 255.0

            # reshape it for the model
            face_roi = np.expand_dims(face_roi, axis=0)
            face_roi = np.expand_dims(face_roi, axis=-1)

            # get emotion prediction
            emotion_prediction = emotion_model.predict(face_roi)
            detected_mood_index = np.argmax(emotion_prediction)

            # assign the mood with highest confidence and the confidence value
            # to the previously intialised variables
            detected_mood = EMOTION_LABELS[detected_mood_index]
            detection_confidence = float(emotion_prediction[0][detected_mood_index] * 100)


        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Error processing mood photo: {str(e)}'
            }), 400

    # if a mood is selected from dropdown
    elif input_method == 'text':
        detected_mood = request.form.get('mood_text', '').capitalize()

    # make sure the detected_mood is valid for the function
    if detected_mood == "Fear":
        detected_mood = 'Frightened'
    valid_moods = ['Angry', 'Frightened', 'Happy', 'Sad',
                   'Chill']
    
    if detected_mood not in valid_moods:
        return jsonify({
            'success': False,
            'error': f'Unsupported mood. Supported moods are: {", ".join(valid_moods)}'
        }), 400

    try:
        # generate recommendationss
        results = recommend_by_mood(
            music_data,
            detected_mood,
            item_type,
            count,
            genre  
        )

        # check if results contain an error
        if isinstance(results, dict) and 'error' in results:
            return jsonify({
                'success': False,
                'error': results['error']
            }), 404

        return jsonify({
            'success': True,
            'mood': detected_mood,
            'confidence': detection_confidence,  # will remain None for text input
            'items': results,
            'item_type': item_type,
            'genre': genre if genre else 'All'  
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)