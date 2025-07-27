// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCiDoIJ0Ep0zs0cCVPsjLuzzbjyMbQs89k",
    authDomain: "timesight-239a3.firebaseapp.com",
    projectId: "timesight-239a3",
    storageBucket: "timesight-239a3.firebasestorage.app",
    messagingSenderId: "109260696464",
    appId: "1:109260696464:web:dd386d0d3897f165122115"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Override the existing authentication system
    const authForm = document.getElementById('authForm');
    const toggleLink = document.getElementById('toggleLink');
    const messageContainer = document.getElementById('messageContainer');
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const currentUserDisplay = document.getElementById('currentUser');
    const userAvatar = document.getElementById('userAvatar');
    const logoutBtn = document.getElementById('logoutBtn');

    // Global variables (replace the existing ones)
    window.currentUser = null;
    window.activities = [];
    window.dailyGoal = 480;
    let isSignUp = false;

    // Override existing showMessage function
    window.showMessage = function(message, type = 'error') {
        messageContainer.innerHTML = `<div class="${type}-message">${message}</div>`;
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    };

    // Override existing toggleAuthMode function
    window.toggleAuthMode = function() {
        const authBtn = document.getElementById('authBtn');
        const toggleText = document.getElementById('toggleText');
        
        isSignUp = !isSignUp;
        if (isSignUp) {
            authBtn.textContent = 'Sign Up';
            toggleText.textContent = 'Already have an account?';
            toggleLink.textContent = 'Sign in';
        } else {
            authBtn.textContent = 'Sign In';
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Create one';
        }
        messageContainer.innerHTML = '';
    };

    // Override existing loadUserData function
    window.loadUserData = async function() {
        if (!window.currentUser) return;
        
        try {
            const userDoc = await getDoc(doc(db, 'users', window.currentUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                window.activities = userData.activities || [];
                window.dailyGoal = userData.dailyGoal || 480;
                
                currentUserDisplay.textContent = userData.username || window.currentUser.email.split('@')[0];
                userAvatar.textContent = (userData.username || window.currentUser.email.split('@')[0]).charAt(0).toUpperCase();
            } else {
                // Create new user document
                const username = window.currentUser.email.split('@')[0];
                await setDoc(doc(db, 'users', window.currentUser.uid), {
                    username: username,
                    email: window.currentUser.email,
                    activities: [],
                    dailyGoal: 480,
                    createdAt: new Date()
                });
                
                window.activities = [];
                window.dailyGoal = 480;
                currentUserDisplay.textContent = username;
                userAvatar.textContent = username.charAt(0).toUpperCase();
            }
            
            // Update the daily goal input
            const dailyGoalInput = document.getElementById('dailyGoal');
            if (dailyGoalInput) {
                dailyGoalInput.value = window.dailyGoal;
            }
            
            // Initialize chart and update UI
            if (typeof window.initChart === 'function') {
                window.initChart();
            }
            if (typeof window.updateUI === 'function') {
                window.updateUI();
            }
            
        } catch (error) {
            console.error('Error loading user data:', error);
            window.showMessage('Error loading user data');
        }
    };

    // Override existing saveUserData function
    window.saveUserData = async function() {
        if (!window.currentUser) return;
        
        try {
            await updateDoc(doc(db, 'users', window.currentUser.uid), {
                activities: window.activities,
                dailyGoal: window.dailyGoal,
                lastUpdated: new Date()
            });
        } catch (error) {
            console.error('Error saving user data:', error);
            window.showMessage('Error saving data');
        }
    };

    // Override existing showApp function
    window.showApp = function() {
        loginContainer.style.display = 'none';
        appContainer.classList.add('active');
    };

    // Override existing logout function
    window.logout = function() {
        auth.signOut().then(() => {
            window.currentUser = null;
            window.activities = [];
            window.dailyGoal = 0;
            loginContainer.style.display = 'flex';
            appContainer.classList.remove('active');
            authForm.reset();
            messageContainer.innerHTML = '';
        });
    };

    // Override the form submission
    authForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        
        const identifier = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const authBtn = document.getElementById('authBtn');

        if (!identifier || !password) {
            window.showMessage('Please fill in all fields');
            return;
        }

        if (password.length < 6) {
            window.showMessage('Password must be at least 6 characters long');
            return;
        }

        // Check if email is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(identifier)) {
            window.showMessage('Please enter a valid email address');
            return;
        }

        // Disable button during authentication
        authBtn.disabled = true;
        const originalText = authBtn.textContent;
        authBtn.textContent = isSignUp ? 'Signing Up...' : 'Signing In...';

        try {
            if (isSignUp) {
                // Sign Up
                const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
                window.currentUser = userCredential.user;
                window.showMessage('Account created successfully! Welcome to TimeSight!', 'success');
                await window.loadUserData();
                window.showApp();
            } else {
                // Sign In
                const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
                window.currentUser = userCredential.user;
                window.showMessage('Welcome back!', 'success');
                await window.loadUserData();
                window.showApp();
            }
        } catch (error) {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Authentication error:', errorCode, errorMessage);
            
            // Handle specific error codes
            switch (errorCode) {
                case 'auth/email-already-in-use':
                    window.showMessage('This email is already registered. Try signing in instead.');
                    break;
                case 'auth/weak-password':
                    window.showMessage('Password is too weak. Please use a stronger password.');
                    break;
                case 'auth/invalid-email':
                    window.showMessage('Invalid email address.');
                    break;
                case 'auth/user-not-found':
                    window.showMessage('No account found with this email.');
                    break;
                case 'auth/wrong-password':
                    window.showMessage('Incorrect password.');
                    break;
                case 'auth/too-many-requests':
                    window.showMessage('Too many failed attempts. Please try again later.');
                    break;
                default:
                    window.showMessage('Authentication error: ' + errorMessage);
            }
        } finally {
            // Re-enable button
            authBtn.disabled = false;
            authBtn.textContent = originalText;
        }
    });

    // Override toggle link click
    toggleLink.addEventListener('click', window.toggleAuthMode);

    // Override logout button
    logoutBtn.addEventListener('click', window.logout);

    // Listen for authentication state changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            window.currentUser = user;
            await window.loadUserData();
            window.showApp();
        } else {
            window.currentUser = null;
            window.activities = [];
            window.dailyGoal = 0;
            loginContainer.style.display = 'flex';
            appContainer.classList.remove('active');
        }
    });
});
