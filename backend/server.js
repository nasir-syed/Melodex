const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); 
const bcrypt = require('bcrypt');
const { connectToMongoDB } = require('./dbconnection.js');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json({ limit: '5mb' }));
app.use(bodyParser.urlencoded({ extended: true }));


app.post('/signup', async (req, res) => {
    try {
        const { username, password, description, privacy, avatar } = req.body;

        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

    
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        
        const usersCollection = await connectToMongoDB('Melodex', 'Users');

    
        const existingUser = await usersCollection.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const newUser = {
            username,
            password: hashedPassword,
            description: description || '',
            privacy: privacy || 'public',
            avatar: avatar || '',
        };

        
        await usersCollection.insertOne(newUser);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'server error' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        const usersCollection = await connectToMongoDB('Melodex', 'Users');

    
        const user = await usersCollection.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        res.status(200).json({ message: 'Login successful', user: { username: user.username, avatar: user.avatar, privacy: user.privacy, description: user.description } });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/get-user-data', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const usersCollection = await connectToMongoDB('Melodex', 'Users');
        const postsCollection = await connectToMongoDB('Melodex', 'Posts');
        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const followingCollection = await connectToMongoDB('Melodex', 'Following');

    
        const user = await usersCollection.findOne({ username }, { projection: { password: 0 } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

    
        const userPosts = await postsCollection.find({ username }).toArray();
        const postCount = userPosts.length;

    
        const followersData = await followersCollection.findOne({ username }) || { followers: [] };
        const followingData = await followingCollection.findOne({ username }) || { following: [] };

        const followersCount = followersData.followers.length;
        const followingCount = followingData.following.length;

        res.status(200).json({
            message: 'User data retrieved successfully',
            user,
            posts: userPosts,
            followersCount,
            followingCount,
            postCount
        });

    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.put('/update-profile', async (req, res) => {
    try {
        const { username, avatar, description, privacy } = req.body;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const usersCollection = await connectToMongoDB('Melodex', 'Users');

        const updateResult = await usersCollection.updateOne(
            { username },
            { $set: { avatar, description, privacy } }
        );

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updatedUser = await usersCollection.findOne(
            { username },
            { projection: { _id: 0, password: 0  } }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'Error retrieving updated user' });
        }

        res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/get-post', async (req, res) => {
    try {
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        const post = await postsCollection.findOne({ _id: new ObjectId(postId) });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.status(200).json({
            message: 'Post retrieved successfully',
            post
        });

    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/create-post', async (req, res) => {
    try {
        const { username, itemTitle, artistName, review, rating, itemCover } = req.body;

        if (!username || !itemTitle || !artistName || !review || !rating || !itemCover) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        const newPost = {
            username,
            itemTitle,
            artistName,
            review,
            rating,
            itemCover,
            likes: [],         
            comments: [],       
        };

        await postsCollection.insertOne(newPost);

        res.status(201).json({ message: 'Post created successfully'});

    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/delete-post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        if (!postId) {
            return res.status(400).json({ message: 'Post ID is required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        const deletionResult = await postsCollection.deleteOne({ _id: new ObjectId(postId) });

        if (deletionResult.deletedCount === 0) {
            return res.status(404).json({ message: 'Post not found or already deleted' });
        }

        res.status(200).json({ message: 'Post deleted successfully' });

    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});




app.post('/search-posts', async (req, res) => {
    try {
        const { query, currentUser } = req.body;

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

    
    
        let searchFilter = {
            $or: [
                { itemTitle: { $regex: query, $options: 'i' } },
                { artistName: { $regex: query, $options: 'i' } },
                { username: { $regex: query, $options: 'i' } }
            ]
        };

    
        if (currentUser) {
            searchFilter.username = { $ne: currentUser };
        }

        const posts = await postsCollection.find(searchFilter).toArray();

        res.status(200).json({ message: 'Posts retrieved successfully', posts });

    } catch (error) {
        console.error('Error searching posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.post('/search-users', async (req, res) => {
    try {
        const { query, currentUser } = req.body; 

        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const usersCollection = await connectToMongoDB('Melodex', 'Users');

    
        let searchFilter = { username: { $regex: query, $options: 'i' } };

    
        if (currentUser) {
            searchFilter.username.$ne = currentUser;
        }

        const users = await usersCollection.find(searchFilter, { projection: { _id: 0, password: 0 } }).toArray();

        res.status(200).json({ message: 'Users retrieved successfully', users });

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.post('/get-user-profile', async (req, res) => {
    try {
        const { loggedInUser, viewedUser } = req.body;

        if (!loggedInUser || !viewedUser) {
            return res.status(400).json({ message: 'Both logged-in user and viewed user are required' });
        }

        const usersCollection = await connectToMongoDB('Melodex', 'Users');
        const postsCollection = await connectToMongoDB('Melodex', 'Posts');
        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const followingCollection = await connectToMongoDB('Melodex', 'Following');

    
        const user = await usersCollection.findOne({ username: viewedUser }, { projection: { password: 0 } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

    
        const followersData = await followersCollection.findOne({ username: viewedUser }) || { followers: [], requests: [] };
        const followingData = await followingCollection.findOne({ username: viewedUser }) || { following: [] };

        const followersCount = followersData.followers.length;
        const followingCount = followingData.following.length;

    
        let isFollowing = followersData.followers.includes(loggedInUser);
        let followRequested = followersData.requests.includes(loggedInUser);

    
        let userPosts = [];
        let postCount = 0;
        if (user.privacy === "public" || isFollowing) {
            userPosts = await postsCollection.find({ username: viewedUser }).toArray();
            postCount = userPosts.length;
        }

        res.status(200).json({
            message: 'User profile retrieved successfully',
            user: {
                username: user.username,
                avatar: user.avatar,
                description: user.description,
                privacy: user.privacy,
                followers: followersCount,
                following: followingCount
            },
            posts: userPosts,
            postCount,
            isFollowing,
            followRequested
        });

    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/follow-user', async (req, res) => {
    try {
        const { loggedInUser, viewedUser, isPublic } = req.body;

        if (!loggedInUser || !viewedUser) {
            return res.status(400).json({ message: 'Both logged-in user and viewed user are required' });
        }

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const notificationsCollection = await connectToMongoDB('Melodex', 'Notifications');

    
        let userFollowers = await followersCollection.findOne({ username: viewedUser });
        if (!userFollowers) {
            userFollowers = { username: viewedUser, requests: [], followers: [] };
            await followersCollection.insertOne(userFollowers);
        }

    
        let userFollowing = await followingCollection.findOne({ username: loggedInUser });
        if (!userFollowing) {
            userFollowing = { username: loggedInUser, following: [] };
            await followingCollection.insertOne(userFollowing);
        }

        if (isPublic) {
        
            await followersCollection.updateOne(
                { username: viewedUser },
                { $addToSet: { followers: loggedInUser } }
            );

            await followingCollection.updateOne(
                { username: loggedInUser },
                { $addToSet: { following: viewedUser } }
            );

            res.status(200).json({ message: 'Successfully followed the user', followStatus: 'following' });
        } else {
        
            await followersCollection.updateOne(
                { username: viewedUser },
                { $addToSet: { requests: loggedInUser } }
            );

        
            await notificationsCollection.insertOne({
                type: 'follow_request',
                fromUser: loggedInUser,
                toUser: viewedUser,
                timestamp: new Date()
            });

            res.status(200).json({ message: 'Follow request sent', followStatus: 'request_sent' });
        }
    } catch (error) {
        console.error('Error handling follow request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/unfollow-user', async (req, res) => {
    try {
        const { loggedInUser, viewedUser } = req.body;

        if (!loggedInUser || !viewedUser) {
            return res.status(400).json({ message: 'Both logged-in user and viewed user are required' });
        }

        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const followersCollection = await connectToMongoDB('Melodex', 'Followers');

    
        await followingCollection.updateOne(
            { username: loggedInUser },
            { $pull: { following: viewedUser } }
        );

    
        await followersCollection.updateOne(
            { username: viewedUser },
            { $pull: { followers: loggedInUser } }
        );

        res.status(200).json({ message: 'Successfully unfollowed user' });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/get-notifications/:username', async (req, res) => {
    try {
        const { username } = req.params;

        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }

        const notificationsCollection = await connectToMongoDB('Melodex', 'Notifications');


        const notifications = await notificationsCollection.find({ toUser: username })
            .sort({ timestamp: -1 })
            .toArray();

        res.status(200).json({ message: 'Notifications retrieved successfully', notifications });

    } catch (error) {
        console.error('Error retrieving notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/cancel-follow-request', async (req, res) => {
    try {
        const { loggedInUser, viewedUser } = req.body;

        if (!loggedInUser || !viewedUser) {
            return res.status(400).json({ message: 'Both logged-in user and viewed user are required' });
        }

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const notificationsCollection = await connectToMongoDB('Melodex', 'Notifications');

    
        await followersCollection.updateOne(
            { username: viewedUser },
            { $pull: { requests: loggedInUser } }
        );

    
        await notificationsCollection.deleteMany({
            type: 'follow_request',
            fromUser: loggedInUser,
            toUser: viewedUser
        });

        res.status(200).json({ message: 'Follow request canceled' });
    } catch (error) {
        console.error('Error canceling follow request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/accept-follow-request', async (req, res) => {
    try {
        const { currentUser, fromUser } = req.body;

        if (!currentUser || !fromUser) {
            return res.status(400).json({ message: 'Both currentUser and fromUser are required' });
        }

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const notificationsCollection = await connectToMongoDB('Melodex', 'Notifications');

        let userFollowers = await followersCollection.findOne({ username: currentUser });

        if (!userFollowers || !userFollowers.requests.includes(fromUser)) {
            return res.status(400).json({ message: 'Follow request not found' });
        }

    
        await followersCollection.updateOne(
            { username: currentUser },
            {
                $pull: { requests: fromUser }, 
                $addToSet: { followers: fromUser }
            }
        );

        let userFollowing = await followingCollection.findOne({ username: fromUser });
        if (!userFollowing) {
            userFollowing = { username: fromUser, following: [] };
            await followingCollection.insertOne(userFollowing);
        }

        await followingCollection.updateOne(
            { username: fromUser },
            { $addToSet: { following: currentUser } } 
        );

        await notificationsCollection.deleteOne({
            type: 'follow_request',
            fromUser: fromUser,
            toUser: currentUser
        });

        await notificationsCollection.insertOne({
            type: 'request_accepted',
            fromUser: currentUser,
            toUser: fromUser,
            timestamp: new Date()
        });

        res.status(200).json({ message: 'Follow request accepted' });
    } catch (error) {
        console.error('Error accepting follow request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/decline-follow-request', async (req, res) => {
    try {
        const { currentUser, fromUser } = req.body;

        if (!currentUser || !fromUser) {
            return res.status(400).json({ message: 'Both currentUser and fromUser are required' });
        }

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');

    
        let userFollowers = await followersCollection.findOne({ username: currentUser });

        if (!userFollowers || !userFollowers.requests.includes(fromUser)) {
            return res.status(400).json({ message: 'Follow request not found' });
        }

    
        await followersCollection.updateOne(
            { username: currentUser },
            { $pull: { requests: fromUser } }
        );

        res.status(200).json({ message: 'Follow request declined' });
    } catch (error) {
        console.error('Error declining follow request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/get-followers', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: 'Username is required' });

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const userFollowers = await followersCollection.findOne({ username }) || { followers: [] };

        res.status(200).json({ message: 'Followers retrieved successfully', followers: userFollowers.followers });
    } catch (error) {
        console.error('Error retrieving followers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/get-following', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ message: 'Username is required' });

        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const userFollowing = await followingCollection.findOne({ username }) || { following: [] };

        res.status(200).json({ message: 'Following retrieved successfully', following: userFollowing.following });
    } catch (error) {
        console.error('Error retrieving following:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.post('/remove-following', async (req, res) => {
    try {
        const { username, removeUser } = req.body;
        if (!username || !removeUser) return res.status(400).json({ message: 'Both username and removeUser are required' });

        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const followersCollection = await connectToMongoDB('Melodex', 'Followers');

        await followingCollection.updateOne(
            { username },
            { $pull: { following: removeUser } }
        );

        await followersCollection.updateOne(
            { username: removeUser },
            { $pull: { followers: username } }
        );

        res.status(200).json({ message: 'User successfully unfollowed' });
    } catch (error) {
        console.error('Error unfollowing user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.post('/remove-follower', async (req, res) => {
    try {
        const { username, removeUser } = req.body;
        if (!username || !removeUser) return res.status(400).json({ message: 'Both username and removeUser are required' });

        const followersCollection = await connectToMongoDB('Melodex', 'Followers');
        const followingCollection = await connectToMongoDB('Melodex', 'Following');

    
        await followersCollection.updateOne(
            { username },
            { $pull: { followers: removeUser } }
        );

    
        await followingCollection.updateOne(
            { username: removeUser },
            { $pull: { following: username } }
        );

        res.status(200).json({ message: 'User successfully removed from followers' });
    } catch (error) {
        console.error('Error removing follower:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.get('/get-home-posts/:username', async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) return res.status(400).json({ message: 'Username is required' });

        const followingCollection = await connectToMongoDB('Melodex', 'Following');
        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        const userFollowingData = await followingCollection.findOne({ username }) || { following: [] };

        if (userFollowingData.following.length === 0) {
            return res.status(200).json({ message: 'There are no posts available', posts: [] });
        }

        const homePosts = await postsCollection.find({ username: { $in: userFollowingData.following } }).toArray();

        res.status(200).json({ message: 'Home posts retrieved successfully', posts: homePosts });
    } catch (error) {
        console.error('Error fetching home posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.get('/get-explore-posts', async (req, res) => {
    try {
        const { username } = req.query;

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');
        const usersCollection = await connectToMongoDB('Melodex', 'Users');
        let excludedUsers = [];

        if (username) {
            const followingCollection = await connectToMongoDB('Melodex', 'Following');
            const userFollowingData = await followingCollection.findOne({ username }) || { following: [] };
            excludedUsers = [...userFollowingData.following, username];
        }
        const publicUsers = await usersCollection.find({ 
            privacy: "public", 
            username: { $nin: excludedUsers } 
        }).toArray();
        const publicUsernames = publicUsers.map(user => user.username);

        const explorePosts = await postsCollection.find({ username: { $in: publicUsernames } }).toArray();

        res.status(200).json({ message: 'Explore posts retrieved successfully', posts: explorePosts });
    } catch (error) {
        console.error('Error fetching explore posts:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



app.post('/like-post', async (req, res) => {
    try {
        const { postId, username } = req.body;

        if (!postId || !username) {
            return res.status(400).json({ message: 'Post ID and username are required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $addToSet: { likes: username } }
        );

        res.status(200).json({ message: 'Post liked successfully' });
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/unlike-post', async (req, res) => {
    try {
        const { postId, username } = req.body;

        if (!postId || !username) {
            return res.status(400).json({ message: 'Post ID and username are required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        
        await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $pull: { likes: username } }
        );

        res.status(200).json({ message: 'Post unliked successfully' });
    } catch (error) {
        console.error('Error unliking post:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/add-comment', async (req, res) => {
    try {
        const { postId, username, text } = req.body;

        if (!postId || !username || !text) {
            return res.status(400).json({ message: 'Post ID, username, and comment text are required' });
        }

        const postsCollection = await connectToMongoDB('Melodex', 'Posts');

        const comment = { username, text, createdAt: new Date() };

        await postsCollection.updateOne(
            { _id: new ObjectId(postId) },
            { $push: { comments: comment } }
        );

        res.status(200).json({ message: 'Comment added successfully', comment });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
