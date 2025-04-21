import numpy as np
import pandas as pd
import json
import random

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


def load_data(dataset_path):
    try:
        df = pd.read_csv(dataset_path)
        return df
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return pd.DataFrame(columns=['track_id', 'track_name', 'album_name', 'artists', 'track_genre', 'popularity'])


def recommend_by_mood(data, mood, item_type='song', count=5, genre=None):
    # mood-specific feature mappings are done 
    mood_features = {
        'angry': {
            'valence': (0.0, 0.3),       
            'energy': (0.7, 1.0),       
            'loudness': (-10, 0),       
            'tempo': (120, 200),        
            'speechiness': (0.3, 1.0),  
            'acousticness': (0.0, 0.4)  
        },
        'frightened': {
            'valence': (0.2, 0.5),      
            'energy': (0.4, 0.6),       
            'instrumentalness': (0.3, 0.7),
            'acousticness': (0.5, 0.8), 
            'tempo': (70, 110),              
        },
        'happy': {
            'valence': (0.7, 1.0),      
            'energy': (0.6, 0.9),       
            'danceability': (0.7, 1.0), 
            'tempo': (110, 160),        
            'loudness': (-8, 0),        
            'mode': (1, 1),             
            'speechiness': (0.0, 0.3)   
        },
        'sad': {
            'valence': (0.3, 0.5),      
            'energy': (0.3, 0.5),       
            'acousticness': (0.5, 0.9), 
            'tempo': (60, 100),                   
            'instrumentalness': (0.2, 0.5)
        },
        'chill': {
            'valence': (0.4, 0.7),      
            'energy': (0.2, 0.5),       
            'acousticness': (0.6, 1.0), 
            'tempo': (60, 100),         
            'instrumentalness': (0.3, 0.8),
            'danceability': (0.3, 0.6), 
            'loudness': (-20, -7)       
        },
    }

    # Select features for the specific mood and get songs with popularity over 30 only 
    features = mood_features.get(mood.lower(), mood_features['happy'])
    mood_data = data[data['popularity'] > 30].copy()

    # Apply genre filter if specified
    if genre:
        mood_data = mood_data[mood_data['track_genre'] == genre]
        if len(mood_data) == 0:
            return {'error': f'No {item_type}s found with genre: {genre}'}

    # Apply the mood feature filters
    for feature, (low, high) in features.items():
        if feature in mood_data.columns:
            mood_data = mood_data[mood_data[feature].between(low, high)]

    # If no songs match, then fall back to broader a selection 
    if len(mood_data) < count:
        mood_data = data[data['popularity'] > 40]
        if genre:
            mood_data = mood_data[mood_data['track_genre'] == genre]

            # If still no songs match with the genre, return error
            if len(mood_data) == 0:
                return {'error': f'No {item_type}s found with genre: {genre}'}

    # Shuffle the entire mood_data dataframe to ensure randomization
    mood_data = mood_data.sample(frac=1, random_state=None).reset_index(drop=True)

    # If there are still not enough items even after the above conditions, then reduce the count to match available items
    if len(mood_data) < count:
        count = len(mood_data)

    if item_type == 'song':
        # Take the first 'count' songs from the already shuffled dataframe
        songs_sample = mood_data.head(count)
        return [{
            'track_name': row['track_name'],
            'artist': row['artists'],
            'album': row['album_name'],
            'genre': row['track_genre'],
            'popularity': int(row['popularity']),
            'duration_ms': int(row.get('duration_ms', 180000))
        } for _, row in songs_sample.iterrows()]

    elif item_type == 'playlist':
        playlists = []
        for i in range(count):
            playlist_size = min(10, len(mood_data))
            if playlist_size == 0:
                break

            # For each playlist, take a different slice of the shuffled dataframe
            # This ensures different songs per playlist
            start_idx = (i * playlist_size) % len(mood_data)
            if start_idx + playlist_size > len(mood_data):
                playlist_songs = pd.concat([
                    mood_data.iloc[start_idx:],
                    mood_data.iloc[:playlist_size - (len(mood_data) - start_idx)]
                ])
            else:
                playlist_songs = mood_data.iloc[start_idx:start_idx + playlist_size]
            
            playlist = {
                'playlist_name': f"{mood.capitalize()} {genre if genre else ''} Mood Playlist",
                'total_duration_ms': int(playlist_songs['duration_ms'].sum()),
                'songs': [{
                    'track_name': row['track_name'],
                    'artist': row['artists'],
                    'duration_ms': int(row.get('duration_ms', 180000))
                } for _, row in playlist_songs.iterrows()]
            }
            playlists.append(playlist)
        return playlists

    else:
        return {'error': 'Invalid item type. Choose "song" or "playlist".'}
    
def recommend_by_activity(data, activity, item_type='song', count=5):
    """
    Recommend songs or playlists based on a specific activity.
    """
    supported_activities = [
        'workout', 'studying', 'relaxing', 'party',
        'focus', 'commuting', 'meditation', 'cooking'
    ]

    if activity not in supported_activities:
        return {'error': f'Unsupported activity. Choose from: {", ".join(supported_activities)}'}

    activity_filters = {
        'workout': {
            'energy': (0.7, 1.0), 
            'tempo': (120, 200), 
            'danceability': (0.6, 1.0) 
        },
        'studying': {
            'instrumentalness': (0.5, 1.0), 
            'energy': (0.0, 0.5), 
            'acousticness': (0.4, 1.0) 
        },
        'relaxing': {
            'energy': (0.0, 0.4), 
            'valence': (0.3, 0.7), 
            'acousticness': (0.5, 1.0), 
            'instrumentalness': (0.3, 1.0) 
        },
        'party': {
            'danceability': (0.7, 1.0), 
            'energy': (0.7, 1.0), 
            'valence': (0.6, 1.0) 
        },
        'commuting': {
            'energy': (0.4, 0.8), 
            'danceability': (0.4, 0.7), 
            'instrumentalness': (0.2, 0.6) 
        },
        'meditation': {
            'energy': (0.0, 0.3), 
            'instrumentalness': (0.6, 1.0), 
            'acousticness': (0.6, 1.0), 
            'valence': (0.3, 0.7) 
        },
        'cooking': {
            'danceability': (0.5, 0.9), 
            'energy': (0.4, 0.7), 
            'valence': (0.5, 0.9) 
        }
    }

    # check for the required columns
    required_columns = list(set([col for filter_dict in activity_filters.values() for col in filter_dict.keys()]))
    missing_columns = [col for col in required_columns if col not in data.columns]

    if missing_columns:
        return {'error': f'Missing columns in dataset: {", ".join(missing_columns)}'}

    if item_type == 'song':
        # apply the activity-specific filters made previously 
        filters = activity_filters[activity]

        # make the filter conditions
        song_conditions = [
            data[col].between(min_val, max_val) if isinstance(min_val, (int, float)) else True
            for col, (min_val, max_val) in filters.items()
        ]

        # combine all the conditions
        songs = data[
            (song_conditions[0]) &
            (song_conditions[1] if len(song_conditions) > 1 else True) &
            (song_conditions[2] if len(song_conditions) > 2 else True)
            ]

        # if there are no songs after filtering, fall back to general sampling
        if len(songs) == 0:
            songs = data

        # sample the songs
        songs_sample = songs.sample(min(count, len(songs)))

        return [{
            'track_name': row['track_name'],
            'artist': row['artists'],
            'album': row['album_name'],
            'genre': row['track_genre'],
            'popularity': int(row['popularity']),
            'duration_ms': int(row.get('duration_ms', 180000))
        } for _, row in songs_sample.iterrows()]

    elif item_type == 'playlist':
        playlists = []
        for _ in range(count):
    
            filters = activity_filters[activity]
            song_conditions = [
                data[col].between(min_val, max_val) if isinstance(min_val, (int, float)) else True
                for col, (min_val, max_val) in filters.items()
            ]

            songs = data[
                (song_conditions[0]) &
                (song_conditions[1] if len(song_conditions) > 1 else True) &
                (song_conditions[2] if len(song_conditions) > 2 else True)
                ]

            if len(songs) == 0:
                songs = data

            playlist_songs = songs.sample(min(10, len(songs)))

            playlist = {
                'playlist_name': f"{activity.capitalize()} Vibes Playlist",
                'total_duration_ms': int(playlist_songs['duration_ms'].sum()),
                'songs': [{
                    'track_name': row['track_name'],
                    'artist': row['artists'],
                    'duration_ms': int(row.get('duration_ms', 180000))
                } for _, row in playlist_songs.iterrows()]
            }
            playlists.append(playlist)

        return playlists

    else:
        return {'error': 'Invalid item type. Choose "song" or "playlist".'}

def random_recommendations(data, item_type, genre=None, count=1):
    if genre:
        filtered_data = data[data['track_genre'] == genre]
        if filtered_data.empty:
            return {'error': f'No items found with genre: {genre}'}
    else:
        filtered_data = data

    if filtered_data.empty:
        return {'error': 'No matching items found in the dataset'}

    if count > len(filtered_data):
        count = len(filtered_data)

    if item_type == 'song':
        sampled = filtered_data.sample(count)
        return [{
            'track_id': row['track_id'],
            'track_name': row['track_name'],
            'artist': row['artists'],
            'album': row['album_name'],
            'genre': row['track_genre'],
            'popularity': int(row['popularity']),
            'duration_ms': int(row.get('duration_ms', 0))
        } for _, row in sampled.iterrows()]

    elif item_type == 'album':
        albums = filtered_data['album_name'].unique()
        if len(albums) > count:
            albums = np.random.choice(albums, count, replace=False)
        else:
            albums = albums[:count]

        return [{
            'album_name': album,
            'artist': filtered_data[filtered_data['album_name'] == album]['artists'].iloc[0],
            'tracks': int(len(filtered_data[filtered_data['album_name'] == album])),
            'genres': filtered_data[filtered_data['album_name'] == album]['track_genre'].unique().tolist()
        } for album in albums]

    elif item_type == 'artist':
        artists = filtered_data['artists'].unique()
        if len(artists) > count:
            artists = np.random.choice(artists, count, replace=False)
        else:
            artists = artists[:count]

        return [{
            'artist': artist,
            'tracks': int(len(filtered_data[filtered_data['artists'] == artist])),
            'albums': filtered_data[filtered_data['artists'] == artist]['album_name'].unique().tolist(),
            'genres': filtered_data[filtered_data['artists'] == artist]['track_genre'].unique().tolist()
        } for artist in artists]

    elif item_type == 'playlist':
        playlists = []
        for i in range(count):
            playlist_size = np.random.randint(5, 15) 
            playlist_songs = filtered_data.sample(min(playlist_size, len(filtered_data)))
            playlist = {
                'playlist_name': f"Random Playlist {i + 1}",
                'total_duration_ms': int(playlist_songs[
                                             'duration_ms'].sum() if 'duration_ms' in playlist_songs.columns else 0),
                'songs': [{
                    'track_name': row['track_name'],
                    'artist': row['artists'],
                    'duration_ms': int(row.get('duration_ms', 180000))
                } for _, row in playlist_songs.iterrows()]
            }
            playlists.append(playlist)
        return playlists

    else:
        return {'error': f'Invalid item type: {item_type}'}


def search_songs(data, query):
    results = data[
        data['track_name'].str.contains(query, case=False, na=False) |
        data['artists'].str.contains(query, case=False, na=False)
        ]

    # limit the results to the top 10
    results = results.head(10)

    return [{
        'track_id': row['track_id'],
        'track_name': row['track_name'],
        'artist': row['artists']
    } for _, row in results.iterrows()]


def get_song_analysis(data, track_id):
    song = data[data['track_id'] == track_id]

    if song.empty:
        return {'error': f'Song with track_id {track_id} not found'}

    song = song.iloc[0]

    return {
        'track_id': song['track_id'],
        'track_name': song['track_name'],
        'artist': song['artists'],
        'album': song['album_name'],
        'genre': song['track_genre'],
        'popularity': int(song['popularity']),
        'duration_ms': int(song.get('duration_ms', 180000)),
        'explicit': bool(song.get('explicit', False)),
        'danceability': float(song.get('danceability', 0.0)),
        'energy': float(song.get('energy', 0.0)),
        'key': int(song.get('key', 0)),
        'loudness': float(song.get('loudness', 0.0)),
        'mode': int(song.get('mode', 0)),
        'speechiness': float(song.get('speechiness', 0.0)),
        'acousticness': float(song.get('acousticness', 0.0)),
        'instrumentalness': float(song.get('instrumentalness', 0.0)),
        'liveness': float(song.get('liveness', 0.0)),
        'valence': float(song.get('valence', 0.0)),
        'tempo': float(song.get('tempo', 0.0)),
        'track_genre': song['track_genre']
    }


def find_obscure_songs(data, genre=None, popularity_threshold=30, count=5):
    filtered_data = data[data['popularity'] <= popularity_threshold]

    if genre:
        filtered_data = filtered_data[filtered_data['track_genre'] == genre]

    if filtered_data.empty:
        return {'error': f'No songs found with popularity below {popularity_threshold}' + (
            f' in genre {genre}' if genre else '')}

    # Sample random songs matching criteria
    sampled = filtered_data.sample(min(count, len(filtered_data)))

    return [{
        'track_id': row['track_id'],
        'track_name': row['track_name'],
        'artist': row['artists'],
        'album': row['album_name'],
        'genre': row['track_genre'],
        'popularity': int(row['popularity']),
        'duration_ms': int(row.get('duration_ms', 180000))
    } for _, row in sampled.iterrows()]


def find_similar_songs(data, track_id, count=5):
    reference_song = data[data['track_id'] == track_id]
    if reference_song.empty:
        return {"error": "Reference song not found"}
    
    # get the songs genre and filter the data to include songs from that genre 
    # (this allows for more accurate recommendations)
    reference_genre = reference_song['track_genre'].iloc[0]
    genre_data = data[data['track_genre'] == reference_genre]

    # if not enough songs in that genre, then return error
    if len(genre_data) <= 1:  
        return {"error": f"Not enough songs in the {reference_genre} genre for comparison"}

    
    reference_features = reference_song[['danceability', 'energy', 'key', 'loudness',
                                         'speechiness', 'acousticness', 'instrumentalness',
                                         'liveness', 'valence', 'tempo']].iloc[0]

    # calculate euclidean distance for all the songs in the same genre for recommendation
    # a copy is made to avoid modifying the original df
    working_data = genre_data.copy()

    # Weights are defined for finding similar songs,
    # a value is assigned between 0 and 1, 
    # the higher the value the more the importance of that attribute and vice versa
    weights = {
        'danceability': 1.0,
        'energy': 1.0,
        'key': 0.5,  # Less weight for key since it has less impact than other features 
        'loudness': 0.8,
        'speechiness': 0.8,
        'acousticness': 1.0,
        'instrumentalness': 0.9,
        'liveness': 0.6, # same as key, less impact
        'valence': 1.0,  
        'tempo': 0.7
    }

    # normalise the features for better comparison
    features = ['danceability', 'energy', 'speechiness', 'acousticness',
                'instrumentalness', 'liveness', 'valence']
    
    
    # normalise key (0-11)
    working_data['key_norm'] = (working_data['key'] - reference_features['key']).abs() / 11

    # normalise the loudness (its usually between -60 and 0)
    max_loudness_diff = 60  # Maximum possible difference
    working_data['loudness_norm'] = (working_data['loudness'] - reference_features[
        'loudness']).abs() / max_loudness_diff

    # normalise tempo 
    max_tempo_diff = 150  # A reasonable maximum
    working_data['tempo_norm'] = (working_data['tempo'] - reference_features['tempo']).abs() / max_tempo_diff

    # calculate the normalised differences for standard features (0-1 scale)
    for feature in features:
        working_data[f'{feature}_diff'] = (working_data[feature] - reference_features[feature]).abs()

    # calculate weighted similarity score
    similarity_score = (
            weights['danceability'] * working_data['danceability_diff'] +
            weights['energy'] * working_data['energy_diff'] +
            weights['key'] * working_data['key_norm'] +
            weights['loudness'] * working_data['loudness_norm'] +
            weights['speechiness'] * working_data['speechiness_diff'] +
            weights['acousticness'] * working_data['acousticness_diff'] +
            weights['instrumentalness'] * working_data['instrumentalness_diff'] +
            weights['liveness'] * working_data['liveness_diff'] +
            weights['valence'] * working_data['valence_diff'] +
            weights['tempo'] * working_data['tempo_norm']
    )

    # convert to similarity (lower distance = higher similarity)
    working_data['similarity_score'] = 1 / (1 + similarity_score)

    # exclude the reference song itself
    similar_songs = working_data[working_data['track_id'] != track_id]

    # Sort by similarity score, highest sim first 
    similar_songs = similar_songs.sort_values('similarity_score', ascending=False)

    # Take the top 'count' number of results (count is the amount of songs requested by the user)
    top_similar = similar_songs.head(count)
    results = []
    for _, song in top_similar.iterrows():
        results.append({
            'track_id': song['track_id'],
            'track_name': song['track_name'],
            'artist': song['artists'],
            'album': song['album_name'],
            'genre': song['track_genre'],
            'popularity': int(song['popularity']),
            'duration_ms': int(song['duration_ms']),
            'similarity_score': float(song['similarity_score'])
        })

    return results