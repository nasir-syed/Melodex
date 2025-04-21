new Vue({
    el: '#app',
    data: {
        currentSection: 'home', 
        currentUser: {
            username: '',
            avatar: '',
            privacy: 'public',
            description: '',
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            posts: [],
            followers: [],
            following: [],
            notifications: []
        },
        sidebarSection: 'home', // New property to track sidebar section
        username: '',
        password: '',
        confirmPassword: '',
        loginUsername: '',
        loginPassword: '',
        signupError: false,
        signupErrorMessage: '',
        signupPrivacy: 'public',
        signupDescription: '',
        profilePictureUrl: '',
        loginError: false,
        loginErrorMessage: '',
        isLoggedIn: false,
        isModalVisible: false,
        searchQuery: '',
        selectedPost: null,
        newPostError: '',
        newComment: '',
        searchResults: [],
        userSearchResults: [],
        homePosts: [],
        explorePosts: [],
        editProfileData: {
            description: '',
            avatarUrl: '',
            isPublic: true
        },
        viewedUser: {
            username: '',
            avatarUrl: '',
            followers: 0,
            following: 0,
            isPublic: true,
            isFollowing: false,
            followRequested: false,
            description: '',
            posts: [],
            postCount: 0,
        },
        isFollowsModalVisible: false,
        followsModalType: 'followers', // 'followers' or 'following'
        followsModalTitle: 'Followers',
        discoverySection: "about", 
        discoveryOptions: [
            { id: 1, title: "Mood-Based Discovery", description: "Find songs that match your mood.", pageName: "mood" },
            { id: 2, title: "Activity-Based Discovery", description: "Discover songs based on activities.", pageName: "activity" },
            { id: 3, title: "Random Discovery", description: "Get a surprise recommendation.", pageName: "random" },
            { id: 4, title: "Song Search & Analysis", description: "Analyse the songs you like.", pageName: "search" },
            { id: 5, title: "Obscure Songs Finder", description: "Discover rare and underrated songs.", pageName: "obscure" },
            { id: 6, title: "Similar Song Discovery", description: "Find songs similar to the one you like.", pageName: "similar" },
        ],
        discoveryIsLoading: false,
        discoveryErrorMessage: '',
        genres: [],
        discoveryResults: [],
        discoveryResultType: '',
        discoveryResultsTitle: '',
        moods: [], 
        activities: [], 
        activityForm: {
            activity: '',
            itemType: 'song',
            count: 5
        },
        randomForm: {
            itemType: 'song',
            genreFilter: '',
            count: 3
        },
        searchForm: {
            query: '',
            selectedSong: null
        },
        obscureForm: {
            genreFilter: '',
            popularityThreshold: 30,
            count: 5
        },
        similarForm: {
            query: '',
            selectedSong: null,
            count: 5
        },
        moodForm: {
            inputMethod: 'text',
            textMood: '',
            itemType: 'song',
            count: 5,
            capturedImage: null,
            genreFilter: '' 
        },
        showWebcam: false,        
        // Search results
        discoverySearchResults: [],
        discoverySearchTimeout: null,
    },
        

    mounted() {
        // Check if user data is stored in localStorage
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const user = JSON.parse(savedUser);
            this.currentUser.username = user.username;
            this.currentUser.avatar = user.avatar
            this.isLoggedIn = true;
            this.fetchHomePosts()
        } 
        else {
            this.sidebarSection = "explore"
            this.fetchExplorePosts();
        }
        
        this.loadGenres();
        this.fetchActivities();
        this.fetchMoods()
    },      
    
    methods: {
        showSection(section) {
            this.currentSection = section;
            if (section == 'discovery') {
                this.loadGenres();
                this.fetchActivities();
                this.fetchMoods()
                this.discoverySection = 'about'
                this.discoveryResults = []
                this.discoveryResultType = ''
                this.discoveryResultsTitle = ''

            }
            if (!this.isLoggedIn) {
                this.sidebarSection = 'explore';
            }

            this.resetErrors();
        },

        // New method to handle bottom nav sections
        showSidebarSection(section) {
            this.sidebarSection = section;
            this.selectedPost = null;
            
        },

        previewProfilePicture(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.profilePictureUrl = e.target.result; // Store Base64 string
                    const previewDiv = document.getElementById('profilePreview');
                    previewDiv.innerHTML = `<img src="${e.target.result}" class="profile-preview-img">`;
                };
                reader.readAsDataURL(file);
            }
        },
        resetErrors() {
            this.signupError = false;
            this.signupErrorMessage = '';
            this.loginError = false;
            this.loginErrorMessage = '';
            
        },
        setRating(rating) {
            const stars = document.querySelectorAll('.rating-select i');
            stars.forEach((star, index) => {
                if (index < rating) {
                    star.className = 'fas fa-star'; // Filled star
                } else {
                    star.className = 'far fa-star'; // Empty star
                }
            });
        },

        handleLogin() {
            this.resetErrors();
        
            if (!this.loginUsername || !this.loginPassword) {
                this.loginError = true;
                this.loginErrorMessage = 'Please enter both username and password.';
                return;
            }
        
            const loginData = {
                username: this.loginUsername,
                password: this.loginPassword
            };
        
            fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Login successful') {
                    // save user data in the vue state
                    this.currentUser = {
                        username: data.user.username,
                        avatar: data.user.avatar,
                        privacy: data.user.privacy,
                        description: data.user.description,
                        followerCount: 0,
                        followingCount: 0,
                        postCount: 0,
                        posts: [],
                        notifications: [],
                        followers: [],
                        following: [],
                    };
                    this.isLoggedIn = true;
                    // store the user data in localStorage
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
        
                    // clear the login fields
                    this.loginUsername = '';
                    this.loginPassword = '';
        
                    // redirect to home tab and section, fetch the home posts for the user 
                    this.sidebarSection = 'home';
                    this.currentSection = 'home'
                    this.selectedPost = null;
                    this.fetchHomePosts()
                } else {
                    this.loginError = true;
                    this.loginErrorMessage = data.message;
                }
            })
            .catch(error => {
                console.error('Login error:', error);
                this.loginError = true;
                this.loginErrorMessage = 'An error occurred during login.';
            });
        },

        handleSignup() {
            this.resetErrors();

            // validate required fields
            if (!this.username || !this.password || !this.confirmPassword) {
                this.signupError = true;
                this.signupErrorMessage = 'All fields must be filled out.';
                return;
            }

            // validate username format
            const usernameRegex = /^[a-zA-Z0-9._]+$/;
            if (!usernameRegex.test(this.username) || this.username.length > 20) {
                this.signupError = true;
                this.signupErrorMessage = 'Username can only contain letters, numbers, ., and _. Max 20 characters.';
                return;
            }

            // validate password length
            if (this.password.length < 8) {
                this.signupError = true;
                this.signupErrorMessage = 'Password must be at least 8 characters long.';
                return;
            }

            // check password confirmation
            if (this.password !== this.confirmPassword) {
                this.signupError = true;
                this.signupErrorMessage = 'Passwords do not match.';
                return;
            }

            // check if user uploaded an avatar
            if (!this.profilePictureUrl) {
                this.signupError = true;
                this.signupErrorMessage = 'Please upload a profile picture.';
                return;
            }

            // check if description is not empty
            if (!this.signupDescription.trim()) {
                this.signupError = true;
                this.signupErrorMessage = 'Please enter a profile description.';
                return;
            }

            // prepare user data
            const userData = {
                username: this.username,
                password: this.password,
                description: this.signupDescription,
                privacy: this.signupPrivacy,
                avatar: this.profilePictureUrl // picture is sent as a base64 string to be stored in the database
            };
            
            fetch('http://localhost:3000/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'User registered successfully') { 

                    this.currentUser = {
                        username: this.username,
                        avatar: this.profilePictureUrl,
                        privacy: this.signupPrivacy,
                        description: this.signupDescription,
                        followerCount: 0,
                        followingCount: 0,
                        postCount: 0,
                        posts: [],
                        notifications: [],
                        followers: [],
                        following: [],
                    };

                    // store the users data in localStorage and log them in
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    this.isLoggedIn = true;

                    this.username = "";
                    this.password = "";
                    this.signupDescription = "";
                    this.signupPrivacy = "";
                    this.profilePictureUrl = "";
                    this.selectedPost = null;

                    // redirect to home
                    this.sidebarSection = 'home';
                    this.currentSection = 'home';

                } else {
                    this.signupError = true;
                    this.signupErrorMessage = data.message;
                }
            })
            .catch(error => {
                console.error('Signup error:', error);
                this.signupError = true;
                this.signupErrorMessage = 'An error occurred during signup.';
            });
        },

        showPostDetails(postId) {
            this.selectedPost = null; 
        
            fetch('http://localhost:3000/get-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Post retrieved successfully') {
                    this.selectedPost = data.post;
                } else {
                    console.error('Error fetching post:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching post:', error);
            });
        },   
             
        showEditProfile() {
            this.editProfileData.avatarUrl = this.currentUser.avatar;
            this.editProfileData.description = this.currentUser.description;
            this.editProfileData.isPublic = this.currentUser.privacy === 'public';
        
            this.sidebarSection = 'edit-profile';
        },
        saveProfileChanges() {
            const updatedProfile = {
                username: this.currentUser.username, 
                avatar: this.editProfileData.avatarUrl, 
                description: this.editProfileData.description, 
                privacy: this.editProfileData.isPublic ? 'public' : 'private'
            };
        
            fetch('http://localhost:3000/update-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProfile)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Profile updated successfully') {
                    this.currentUser.avatar = data.user.avatar;
                    this.currentUser.description = data.user.description;
                    this.currentUser.privacy = data.user.privacy;
        
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
        
                    this.sidebarSection = 'account';
        
                } else {
                    console.error(`Profile update failed: ${data.message}`); 
                }
            })
            .catch(error => {
                console.error('Profile update error:', error); 
            });
        },           
        fetchUserData() {
            fetch('http://localhost:3000/get-user-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.currentUser.username })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'User data retrieved successfully') {
    
                    // Populate edit profile data
                    this.editProfileData.avatarUrl = data.user.avatar;
                    this.editProfileData.description = data.user.description;
                    this.editProfileData.isPublic = data.user.privacy === 'public';
                    
                    this.currentUser = {
                        username: data.user.username,
                        avatar: data.user.avatar,
                        privacy: data.user.privacy,
                        description: data.user.description,
                        followerCount: data.followersCount,
                        followingCount: data.followingCount,
                        postCount: data.postCount,
                        posts: data.posts,
                        notifications: this.currentUser.notifications
                    };
    
                } else {
                    console.error('Error fetching user data:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
        },                    
        confirmLogout() {
            this.isModalVisible = true;
        },
        closeModal() {
            this.isModalVisible = false;
        },
        handleLogout() {
            this.isLoggedIn = false;
            this.currentUser.username= '';
            this.currentUser.description = '';
            this.currentUser.privacy = '';
            this.currentUser.description = '';
            this.currentUser.followerCount = 0;
            this.currentUser.followingCount = 0;
            this.currentUser.postCount = 0
            this.currentUser.posts = []
            this.currentUser.notifications = []
            this.currentUser.followers = []
            this.currentUser.following = []
            this.selectedPost = null;
            this.closeModal()
        
            // Remove user data from localStorage
            localStorage.removeItem('currentUser');
        
            // Redirect to home
            this.currentSection = 'home';
            this.sidebarSection = 'explore';
            this.fetchExplorePosts()
        },
        // Method to clear the selected post and go back to About
        clearSelectedPost() {
            this.selectedPost = null;
        },
        
        
        handleNewPost() {
            this.newPostError = '';

            const itemTitle = document.querySelector('input[placeholder="Album/Track Title"]').value.trim();
            const artistName = document.querySelector('input[placeholder="Artist Name"]').value.trim();
            const review = document.querySelector('textarea[placeholder="Write your review..."]').value.trim();
            const rating = document.querySelectorAll('.rating-select .fas').length; // count the filled stars
            const itemCover = document.getElementById('albumPreview').style.backgroundImage.slice(5, -2); // get the image URL
        
            // validation
            if (!itemTitle || !artistName || !review || rating === 0 || !itemCover) {
                this.newPostError = 'All fields must be filled out, including rating and album cover.';
                return;
            }
        
            const postData = {
                username: this.currentUser.username, 
                itemTitle,
                artistName,
                review,
                rating,
                itemCover
            };
        
            fetch('http://localhost:3000/create-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Post created successfully') { //clear the fields
                    document.querySelector('input[placeholder="Album/Track Title"]').value = '';
                    document.querySelector('input[placeholder="Artist Name"]').value = '';
                    document.querySelector('textarea[placeholder="Write your review..."]').value = '';
                    document.getElementById('albumPreview').style.backgroundImage = '';
                    this.sidebarSection = 'home';
                } else {
                    this.newPostError = data.message;
                }
            })
            .catch(error => {
                console.error('Post creation error:', error);
                this.newPostError = 'An error occurred while creating your post.';
            });
        },        

        deletePost(postId) {
            fetch(`http://localhost:3000/delete-post/${postId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Post deleted successfully') {
                    this.currentUser.posts = this.currentUser.posts.filter(post => post._id !== postId);
                    this.currentUser.postCount -= 1;
                } else {
                    // handle any specific error messages if needed
                    console.warn('Unexpected response:', data);
                }
            })
            .catch(error => {
                console.error('Delete post error:', error);
            });
        },        

        previewImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewDiv = document.getElementById('albumPreview');
                    previewDiv.innerHTML = '';
                    previewDiv.style.backgroundImage = `url(${e.target.result})`;
                    previewDiv.style.backgroundSize = 'cover';
                    previewDiv.style.backgroundPosition = 'center';
                };
                reader.readAsDataURL(file);
            }
        },

        performSearch() {
            // clear the previous results to prevent errors 
            this.searchResults = [];
            this.userSearchResults = [];
        
            const query = this.searchQuery.trim().toLowerCase();
        
            if (!query) {
                return;
            }
        
            // if the search starts with '@', search for users rather than posts
            if (query.startsWith('@')) {
                const usernameQuery = query.substring(1); // remove the '@' before the search
                fetch('http://localhost:3000/search-users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: usernameQuery, currentUser: this.currentUser.username }) 
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'Users retrieved successfully') {
                        this.userSearchResults = data.users;
                    } else {
                        console.error('Error searching users:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error searching users:', error);
                });
            } 
            // otherwise, search for posts
            else {
                fetch('http://localhost:3000/search-posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, currentUser: this.currentUser.username }) 
                })
                .then(response => response.json())
                .then(data => {
                    if (data.message === 'Posts retrieved successfully') {
                        this.searchResults = data.posts;
                    } else {
                        console.error('Error searching posts:', data.message);
                    }
                })
                .catch(error => {
                    console.error('Error searching posts:', error);
                });
            }
        
            this.sidebarSection = 'search-results';
        },              

        viewUserProfile(username) {
            fetch('http://localhost:3000/get-user-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ loggedInUser: this.currentUser.username, viewedUser: username })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'User profile retrieved successfully') {
                    this.viewedUser.username = data.user.username;
                    this.viewedUser.avatarUrl = data.user.avatar;
                    this.viewedUser.description = data.user.description;
                    this.viewedUser.followers = data.user.followers;
                    this.viewedUser.following = data.user.following;
                    this.viewedUser.isPublic = data.user.privacy === "public";
                    this.viewedUser.isFollowing = data.isFollowing;
                    this.viewedUser.followRequested = data.followRequested;
                    this.viewedUser.posts = data.posts;
                    this.viewedUser.postCount = data.postCount;
        
                    this.sidebarSection = 'user-profile';
                } else {
                    console.error('Error fetching user profile:', data.message);
                }
            })
            .catch(error => {
                console.error('Error fetching user profile:', error);
            });
        },

        
        sendFollowRequest() {
            fetch('http://localhost:3000/follow-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loggedInUser: this.currentUser.username,
                    viewedUser: this.viewedUser.username,
                    isPublic: this.viewedUser.isPublic
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Successfully followed the user') {
                    this.viewedUser.isFollowing = true;
                    this.viewedUser.followers += 1; 
                } else if (data.message === 'Follow request sent') {
                    this.viewedUser.followRequested = true;
                } else {
                    console.error('Follow request error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error sending follow request:', error);
            });
        },

        unfollowUser() {
            fetch('http://localhost:3000/unfollow-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loggedInUser: this.currentUser.username,
                    viewedUser: this.viewedUser.username
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Successfully unfollowed user') {
                    this.viewedUser.isFollowing = false;
                    this.viewedUser.followers -= 1;
                } else {
                    console.error('Unfollow error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error unfollowing user:', error);
            });
        },

        cancelFollowRequest() {
            fetch('http://localhost:3000/cancel-follow-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    loggedInUser: this.currentUser.username,
                    viewedUser: this.viewedUser.username
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Follow request canceled') {
                    this.viewedUser.followRequested = false;
                } else {
                    console.error('Cancel request error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error canceling follow request:', error);
            });
        },
        acceptFollowRequest(fromUser) {
            fetch('http://localhost:3000/accept-follow-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentUser: this.currentUser.username,
                    fromUser: fromUser
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Follow request accepted') {
                    // Remove notification and update UI
                    this.currentUser.notifications = this.currentUser.notifications.filter(n => n.fromUser !== fromUser || n.type !== 'follow_request');
                } else {
                    console.error('Accept request error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error accepting follow request:', error);
            });
        },
    
        declineFollowRequest(fromUser) {
            fetch('http://localhost:3000/decline-follow-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentUser: this.currentUser.username,
                    fromUser: fromUser
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.message === 'Follow request declined') {
                    this.currentUser.notifications = this.currentUser.notifications.filter(n => n.fromUser !== fromUser || n.type !== 'follow_request');
                } else {
                    console.error('Decline request error:', data.message);
                }
            })
            .catch(error => {
                console.error('Error declining follow request:', error);
            });
        },
        previewProfileImage(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.editProfileData.avatarUrl = e.target.result; // Store Base64 image
                };
                reader.readAsDataURL(file);
            }
        },   
        
        async fetchNotifications() {
            try {
                const response = await fetch(`http://localhost:3000/get-notifications/${this.currentUser.username}`);
                const data = await response.json();
        
                if (data.message === 'Notifications retrieved successfully') {
                    this.currentUser.notifications = data.notifications;
                } else {
                    console.error('Error fetching notifications:', data.message);
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }
        },
        
        triggerSearch() {
            if (this.searchQuery.trim()) {
                this.performSearch();
            }
        },
        async showFollowsModal(type) {
            this.followsModalType = type;
            this.followsModalTitle = type === 'followers' ? 'Followers' : 'Following';
    
            const endpoint = type === 'followers' ? '/get-followers' : '/get-following';
    
            try {
                const response = await fetch(`http://localhost:3000${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: this.currentUser.username })
                });
    
                const data = await response.json();
    
                if (data.message.includes('retrieved successfully')) {
                    if (type === 'followers') {
                        this.currentUser.followers = data.followers;
                    } else {
                        this.currentUser.following = data.following;
                    }
    
                    // ✅ Set followsList after fetching
                    this.followsList = type === 'followers' ? this.currentUser.followers : this.currentUser.following;
    
                    // ✅ Now show the modal
                    this.isFollowsModalVisible = true;
                } else {
                    console.error(`Error fetching ${type}:`, data.message);
                }
            } catch (error) {
                console.error(`Error fetching ${type}:`, error);
            }
        },
        closeFollowsModal() {
            this.isFollowsModalVisible = false;
        },  
        async removeFollowing(user) {
            try {
                const response = await fetch('http://localhost:3000/remove-following', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.currentUser.username,
                        removeUser: user
                    })
                });
    
                const data = await response.json();
    
                if (data.message === 'User successfully unfollowed') {
                    // ✅ Update following list and count immediately
                    this.currentUser.following = this.currentUser.following.filter(u => u !== user);
                    this.currentUser.followingCount = this.currentUser.following.length; // Update count
                } else {
                    console.error('Error removing user from following:', data.message);
                }
            } catch (error) {
                console.error('Error removing user from following:', error);
            }
        },
    
        // ✅ Remove a User from Followers
        async removeFollower(user) {
            try {
                const response = await fetch('http://localhost:3000/remove-follower', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: this.currentUser.username,
                        removeUser: user
                    })
                });
    
                const data = await response.json();
    
                if (data.message === 'User successfully removed from followers') {
                    // ✅ Update followers list and count immediately
                    this.currentUser.followers = this.currentUser.followers.filter(u => u !== user);
                    this.currentUser.followerCount = this.currentUser.followers.length; // Update count
                } else {
                    console.error('Error removing user from followers:', data.message);
                }
            } catch (error) {
                console.error('Error removing user from followers:', error);
            }
        },

        async fetchHomePosts() {
            try {
                const response = await fetch(`http://localhost:3000/get-home-posts/${this.currentUser.username}`);

                const data = await response.json();
    
                if (data.message === 'Home posts retrieved successfully') {
                    this.homePosts = data.posts;
                } else {
                    console.error('There was an error in fetching home posts:', data.message);
                }
            } catch (error) {
                console.error('There was an error:', error);
            }
        },
    
        async fetchExplorePosts() {
            try {
                const url = this.isLoggedIn 
                ? `http://localhost:3000/get-explore-posts?username=${this.currentUser.username}` 
                : `http://localhost:3000/get-explore-posts`;

                const response = await fetch(url);

                const data = await response.json();

    
                if (data.message === 'Explore posts retrieved successfully') {
                    this.explorePosts = data.posts;
                } else {
                    console.error('There was an error in fetching explore posts:', data.message);
                }
            } catch (error) {
                console.error('There was an error :', error);
            }
        },
        
        async toggleLikePost(postId) {
            try {
                // Check if the user has already liked the post using selectedPost.likes
                const isLiked = this.selectedPost.likes.includes(this.currentUser.username);
    
                // Determine the correct API endpoint
                const endpoint = isLiked ? '/unlike-post' : '/like-post';
    
                const response = await fetch(`http://localhost:3000${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId, username: this.currentUser.username })
                });
    
                const data = await response.json();
    
                if (data.message.includes('successfully')) {
                    if (isLiked) {
                        this.selectedPost.likes = this.selectedPost.likes.filter(user => user !== this.currentUser.username);
                    } else {
                        this.selectedPost.likes.push(this.currentUser.username);
                    }
                } else {
                    console.error('Error updating like:', data.message);
                }
            } catch (error) {
                console.error('Error handling like/unlike:', error);
            }
        },
        async submitComment(postId) {
            if (!this.newComment.trim()) return;
        
            try {
                const response = await fetch('http://localhost:3000/add-comment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        postId,
                        username: this.currentUser.username,
                        text: this.newComment
                    })
                });
        
                const data = await response.json();
        
                if (data.message === 'Comment added successfully') {
                    const newComment = {
                        username: this.currentUser.username,
                        text: this.newComment,
                        createdAt: new Date().toISOString()
                    };
        
                    if (this.selectedPost && this.selectedPost._id === postId) {
                        this.selectedPost.comments.push(newComment);
                    }
        
                    this.newComment = ''; 
                } else {
                    console.error('Error submitting comment:', data.message);
                }
            } catch (error) {
                console.error('Error submitting comment:', error);
            }
        },   
        showDiscoverySection(pageName) {
            this.discoverySection = pageName;
            this.discoveryErrorMessage = '';
            this.discoveryResults = [];
            this.discoveryResultType = "";
            this.discoveryResultsTitle = '';
        },

        async loadGenres() {
            try {
                const response = await fetch('http://localhost:5000/api/genres');
        
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
        
                const data = await response.json(); // Convert response to JSON
        
                if (data.success) {
                    this.genres = data.genres;
                }
            } catch (error) {
                console.error('Error loading genres:', error);
            }
        }, 

        async fetchMoods() {
            try {
                const response = await fetch('http://localhost:5000/api/moods');
                const data = await response.json();
                if (data.success) {
                    this.moods = data.moods;
                    
                    if (!this.moodForm.textMood && this.moods.length > 0) {
                        this.moodForm.textMood = this.moods[0];
                    }
                }
            } catch (error) {
                console.error('Error fetching moods:', error);
            }
        },
        

        async fetchActivities() {
            try {
                const response = await fetch('http://localhost:5000/api/activities');
                const data = await response.json();
                
                if (data.success) {
                    this.activities = data.activities;
                     
                    if (this.activities.length > 0) {
                        this.activityForm.activity = this.activities[0];
                    }
                }
            } catch (error) {
                console.error('Error fetching activities:', error);
            }
        },
        
        formatDuration(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        },

        async submitRandomForm() {
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = [];
        
            try {
                let params = new URLSearchParams({
                    item_type: this.randomForm.itemType,
                    count: this.randomForm.count
                });
        
                if (this.randomForm.genreFilter) {
                    params.append('genre', this.randomForm.genreFilter);
                }
        
                const response = await fetch(`http://localhost:5000/api/random?${params.toString()}`, {
                    method: 'GET'
                });
        
                const data = await response.json();
        
                if (data.success) {
                    this.discoveryResults = data.items;
        
                    // setting the results types by adding an "s" to the existing type,
                    // pretty inefficient and could be changed, but works for the time being
                    if (this.randomForm.itemType === 'song') {
                        this.discoveryResultType = 'songs';
                        this.discoveryResultsTitle = 'Random Songs';
                    } else if (this.randomForm.itemType === 'album') {
                        this.discoveryResultType = 'albums';
                        this.discoveryResultsTitle = 'Random Albums';
                    } else if (this.randomForm.itemType === 'artist') {
                        this.discoveryResultType = 'artists';
                        this.discoveryResultsTitle = 'Random Artists';
                    } else if (this.randomForm.itemType === 'playlist') {
                        this.discoveryResultType = 'playlists';
                        this.discoveryResultsTitle = 'Random Playlists';
                    }
                } else {
                    this.discoveryErrorMessage = data.error || 'Failed to generate random items';
                }
            } catch (error) {
                console.error('Error:', error);
                this.discoveryErrorMessage = 'An error occurred while processing your request';
            } finally {
                this.discoveryIsLoading = false;
            }
        },        

        async findObscureSongs() {
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = [];
            
            try {
              let params = {
                popularity_threshold: this.obscureForm.popularityThreshold,
                count: this.obscureForm.count
              };
              
              if (this.obscureForm.genreFilter) {
                params.genre = this.obscureForm.genreFilter;
              }
            
              const url = new URL('http://localhost:5000/api/obscure');
              Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
              
              const response = await fetch(url);
              const data = await response.json();
              
              if (data.success) {
                this.discoveryResults = data.songs;
                this.discoveryResultType = 'songs';
                this.discoveryResultsTitle = 'Obscure Songs';
              } else {
                this.discoveryErrorMessage = data.error || 'Failed to find obscure songs';
              }
            } catch (error) {
              console.error('Error:', error);
              this.discoveryErrorMessage = error.message || 'An error occurred while finding obscure songs';
            } finally {
              this.discoveryIsLoading = false;
            }
          },

          async searchSongs(formType = 'search') {

            const query = formType === 'similar' ? this.similarForm.query : this.searchForm.query;

            if (query.length < 2) {
                this.discoverySearchResults = [];
                return;
            }
            
            // clear any existing timeout to prevent issues 
            if (this.searchTimeout) {
                clearTimeout(this.searchTimeout);
            }
            
            // and set a new one to avoid sending too many request 
            this.searchTimeout = setTimeout(async () => {
                try {
                    const url = new URL('http://localhost:5000/api/search');
                    url.searchParams.append('query', query);
                    
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.success) {
                        // a map is used to remove duplicates from the results (a dataset limitation)
                        const uniqueResults = new Map();
                        
                        //  a set to track name+artist combinations
                        const nameArtistCombos = new Set();
                        
                        // filtering results to ensure the uniqueness by both ID and name+artist
                        data.results.forEach(result => {
                            const trackId = result.track_id;
                            const nameArtistKey = `${result.track_name.toLowerCase()}|${result.artist.toLowerCase()}`;
                            
                            // only add if the combo hasn't been seen beforee
                            if (!nameArtistCombos.has(nameArtistKey)) {
                                uniqueResults.set(trackId, result);
                                nameArtistCombos.add(nameArtistKey);
                            }
                        });
                        
                        // converting the values of the map back to an array
                        this.discoverySearchResults = Array.from(uniqueResults.values());
                    } else {
                        this.discoverySearchResults = [];
                    }
                } catch (error) {
                    console.error('Error searching songs:', error);
                    this.discoverySearchResults = [];
                }
            }, 300);
        },
        
        // for selecting a song from the results returned by the searchSongs function
        selectSong(song) {
            this.searchForm.selectedSong = song;
            this.searchForm.query = song.track_name;
            this.discoverySearchResults = [];
        },
        
        calculateLoudnessWidth(loudness) {
            return Math.min(100, Math.max(0, (loudness + 60) / 60 * 100));
        },

        getKeyName(key) {
            const keyNames = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'];
            return key >= 0 && key < keyNames.length ? keyNames[key] : 'Unknown';
        },
        
        // for song analysis
        async analyseSong() {
            if (!this.searchForm.selectedSong) {
                this.discoveryErrorMessage = 'Please select a song first';
                return;
            }
            
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = []; 
            
            try {
                const url = new URL('http://localhost:5000/api/analyse');
                url.searchParams.append('track_id', this.searchForm.selectedSong.track_id);
                
                const response = await fetch(url);
                const data = await response.json();
                console.log(data)
                
                if (data.success) {
                    this.discoveryResults = { ...data.analysis };
                    this.discoveryResultType = 'analysis';
                    this.discoveryResultsTitle = 'Song Analysis';
                } else {
                    this.discoveryErrorMessage = data.error || 'Failed to analyse song';
                }
            } catch (error) {
                console.error('Error:', error);
                this.discoveryErrorMessage = error.message || 'An error occurred while analysing the song';
            } finally {
                this.discoveryIsLoading = false;
            }
        },

        // select a song specifically for the similar songs feature
        selectSongForSimilar(song) {
            this.similarForm.selectedSong = song;
            this.similarForm.query = song.track_name;
            this.discoverySearchResults = [];
        },
        
        // find similar songs based on a selected track
        async findSimilarSongs() {
            if (!this.similarForm.selectedSong) {
                this.discoveryErrorMessage = 'Please select a song first';
                return;
            }
            
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = [];
            
            try {
                const url = new URL('http://localhost:5000/api/similar');
                url.searchParams.append('track_id', this.similarForm.selectedSong.track_id);
                url.searchParams.append('count', this.similarForm.count);
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.success) {
                    this.discoveryResults = data.similar_songs;
                    this.discoveryResultType = 'songs';
                    this.discoveryResultsTitle = 'Similar Songs';
                } else {
                    this.discoveryErrorMessage = data.error || 'Failed to find similar songs';
                }
            } catch (error) {
                console.error('Error:', error);
                this.discoveryErrorMessage = error.message || 'An error occurred while finding similar songs';
            } finally {
                this.discoveryIsLoading = false;
            }
        },

        async submitActivityForm() {
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = [];
        
            try {
                let params = new URLSearchParams({
                    activity: this.activityForm.activity,
                    item_type: this.activityForm.itemType,
                    count: this.activityForm.count
                });

                console.log('Request URL:', `http://localhost:5000/api/activity-recommend?${params.toString()}`);
        
                const response = await fetch(`http://localhost:5000/api/activity-recommend?${params.toString()}`, {
                    method: 'GET'
                });
        
                const data = await response.json();
                console.log('Raw Response:', response.text);
        
                if (data.success) {
                    this.discoveryResults = data.items;
                    this.discoveryResultType = this.activityForm.itemType + 's';
                    this.discoveryResultsTitle = `${this.activityForm.activity.charAt(0).toUpperCase() + this.activityForm.activity.slice(1)} ${this.discoveryResultType}`;
                } else {
                    this.discoveryErrorMessage = data.error || 'Failed to generate activity-based recommendations';
                }
            } catch (error) {
                console.error('Error:', error);
                this.discoveryErrorMessage = 'An error occurred while processing your request';
            } finally {
                this.discoveryIsLoading = false;
            }
        },
        

        async submitMoodForm() {
            this.discoveryErrorMessage = '';
            this.discoveryIsLoading = true;
            this.discoveryResults = [];

            const formData = new FormData();
            
            formData.append('input_method', this.moodForm.inputMethod);
            formData.append('item_type', this.moodForm.itemType);
            formData.append('count', this.moodForm.count);
            
            // if present, add genre filter 
            if (this.moodForm.genreFilter) {
                formData.append('genre', this.moodForm.genreFilter);
            }

            // add mood input
            if (this.moodForm.inputMethod === 'photo' && this.moodForm.capturedImage) {
                // if photo then convert the base64 string to blob
                const blob = await (await fetch(this.moodForm.capturedImage)).blob();
                formData.append('mood_photo', blob, 'mood_photo.jpg');

            } else if (this.moodForm.inputMethod === 'text') {
                formData.append('mood_text', this.moodForm.textMood);
            }

            try {
                const response = await fetch('http://localhost:5000/api/mood-recommend', {
                    method: 'POST',
                    body: formData
                });
        
                const data = await response.json();
        
                if (data.success) {
                    this.discoveryResults = [
                        {
                            mood: data.mood,
                            confidence: data.confidence,
                            items: data.items 
                        }
                    ];
                    
                    if (this.moodForm.itemType === 'song') {
                        this.discoveryResultType = 'songs';
                        this.discoveryResultsTitle = 'Mood-Matched Songs';
                    } else {
                        this.discoveryResultType = 'playlists';
                        this.discoveryResultsTitle = 'Mood-Matched Playlists';
                    }
                    
                } else {
                    this.discoveryErrorMessage = data.error || 'Failed to generate mood-based recommendations';
                }
            } catch (error) {
                console.error('Error:', error);
                this.discoveryErrorMessage = 'An error occurred while processing your request';
            } finally {
                this.discoveryIsLoading = false;
            }
        },
    
        handlePhotoUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.moodForm.capturedImage = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        },
    
        openWebcam() {
            this.showWebcam = true;
            this.$nextTick(() => {
                // access the webcam on the device 
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then(stream => {
                        this.$refs.webcamVideo.srcObject = stream;
                    })
                    .catch(err => {
                        console.error("Error accessing webcam:", err);
                        this.discoveryErrorMessage = "Could not access webcam. Please upload a photo instead."
                    });
            });
        },
    
        capturePhoto() {
            const video = this.$refs.webcamVideo;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            

            const ctx = canvas.getContext('2d');
            
            // mirroring the image
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0);
            
            // stop the video stream
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        
            // convert the image to base64 string 
            this.moodForm.capturedImage = canvas.toDataURL('image/jpeg');
            this.showWebcam = false;
        },
    
        closeWebcam() {
            if (this.$refs.webcamVideo && this.$refs.webcamVideo.srcObject) {
                const tracks = this.$refs.webcamVideo.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            this.showWebcam = false;
        },
    
        clearImage() {
            this.moodForm.capturedImage = null;
        },
        
    },
    watch: {
        sidebarSection(newSection) {
            if (newSection === 'home') {
                this.fetchHomePosts();
            } else if (newSection === 'explore') {
                this.fetchExplorePosts();
            } else if (newSection === 'account') {
                this.fetchUserData();
            } else if (newSection === 'notifications') {
                this.fetchNotifications();
            }
        }
    }
});