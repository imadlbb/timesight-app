// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiDoIJ0Ep0zs0cCVPsjLuzzbjyMbQs89k",
  authDomain: "timesight-239a3.firebaseapp.com",
  projectId: "timesight-239a3",
  storageBucket: "timesight-239a3.appspot.com",
  messagingSenderId: "109260696464",
  appId: "1:109260696464:web:dd386d0d3897f165122115"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current session
let currentUser = null;
let activities = [];
let dailyGoal = 480;
let isSignUp = false;
let timeChart = null;

// DOM Elements
const loginContainer = document.getElementById('loginContainer');
const appContainer = document.getElementById('appContainer');
const authForm = document.getElementById('authForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('authBtn');
const toggleLink = document.getElementById('toggleLink');
const toggleText = document.getElementById('toggleText');
const messageContainer = document.getElementById('messageContainer');
const currentUserDisplay = document.getElementById('currentUser');
const userAvatar = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggle = document.getElementById('themeToggle');
const activityName = document.getElementById('activityName');
const activityCategory = document.getElementById('activityCategory');
const activityDuration = document.getElementById('activityDuration');
const logActivityBtn = document.getElementById('logActivity');
const activityList = document.getElementById('activityList');
const dailyGoalInput = document.getElementById('dailyGoal');
const setGoalBtn = document.getElementById('setGoal');
const exportBtn = document.getElementById('exportBtn');
const goalProgress = document.getElementById('sidebarGoalProgress');
const goalMinutes = document.getElementById('goalMinutes');
const goalProgressBar = document.getElementById('goalProgressBar');

// Authentication Functions
function showMessage(message, type = 'error') {
  messageContainer.innerHTML = `<div class="${type}-message">${message}</div>`;
  setTimeout(() => {
    messageContainer.innerHTML = '';
  }, 5000);
}

function toggleAuthMode() {
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
}

async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    await loadUserData();
    showApp();
    showMessage('Welcome back!', 'success');
    return true;
  } catch (error) {
    console.error('Login error:', error);
    showMessage('Invalid email or password');
    return false;
  }
}

async function signUp(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', currentUser.uid), {
      username: email.split('@')[0],
      email: email,
      dailyGoal: 480,
      createdAt: new Date()
    });
    
    await loadUserData();
    showApp();
    showMessage('Account created successfully! Welcome to TimeSight!', 'success');
    return true;
  } catch (error) {
    console.error('Signup error:', error);
    showMessage('Email already in use');
    return false;
  }
}

async function loadUserData() {
  if (!currentUser) return;
  
  try {
    // Load user data
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      dailyGoal = userData.dailyGoal || 480;
      dailyGoalInput.value = dailyGoal;
      
      // Load activities
      const activitiesRef = collection(db, `users/${currentUser.uid}/activities`);
      const querySnapshot = await getDocs(activitiesRef);
      activities = [];
      querySnapshot.forEach(doc => {
        activities.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort activities by date (newest first)
      activities.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      currentUserDisplay.textContent = userData.username || currentUser.email.split('@')[0];
      userAvatar.textContent = (userData.username || currentUser.email.split('@')[0]).charAt(0).toUpperCase();
    } else {
      // Create new user document if it doesn't exist
      await setDoc(doc(db, 'users', currentUser.uid), {
        username: currentUser.email.split('@')[0],
        email: currentUser.email,
        dailyGoal: 480,
        createdAt: new Date()
      });
      
      dailyGoal = 480;
      activities = [];
      dailyGoalInput.value = dailyGoal;
      currentUserDisplay.textContent = currentUser.email.split('@')[0];
      userAvatar.textContent = currentUser.email.split('@')[0].charAt(0).toUpperCase();
    }
    
    initChart();
    updateUI();
  } catch (error) {
    console.error('Error loading user data:', error);
    showMessage('Error loading user data');
  }
}

async function saveUserData() {
  if (!currentUser) return;
  
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      dailyGoal: dailyGoal
    });
  } catch (error) {
    console.error('Error saving user data:', error);
    showMessage('Error saving data');
  }
}

function showApp() {
  loginContainer.style.display = 'none';
  appContainer.classList.add('active');
}

function logout() {
  signOut(auth).then(() => {
    currentUser = null;
    activities = [];
    dailyGoal = 0;
    loginContainer.style.display = 'flex';
    appContainer.classList.remove('active');
    authForm.reset();
    messageContainer.innerHTML = '';
  }).catch((error) => {
    console.error('Logout error:', error);
    showMessage('Logout failed');
  });
}

function initChart() {
  const ctx = document.getElementById('timeChart').getContext('2d');
  if (timeChart) {
    timeChart.destroy();
  }
  timeChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['math', 'physics', 'chemistry', 'svt', 'philosophy', 'english', 'french', 'arabic'],
      datasets: [{
        data: [0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#006990', '#9cedfb', '#5865F2', '#FFFF00',
          '#89ff9f', '#AEC6CF', '#2E7D32', '#964B00'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' }
      }
    }
  });
}

function updateProgressBar() {
  if (dailyGoal > 0) {
    const todayTotal = getTodayTotal();
    const progress = Math.min((todayTotal / dailyGoal) * 100, 100);
    
    goalProgress.querySelector('div:first-child').textContent = `Goal Progress: ${Math.round(progress)}%`;
    goalMinutes.textContent = `${todayTotal}/${dailyGoal} mins`;
    goalProgressBar.style.width = `${progress}%`;
    
    if (progress >= 100) {
      goalProgress.classList.add('goal-completed');
      goalProgressBar.style.background = 'var(--success)';
    } else {
      goalProgress.classList.remove('goal-completed');
      goalProgressBar.style.background = 'linear-gradient(to right, var(--primary), var(--secondary))';
    }
  } else {
    goalProgress.querySelector('div:first-child').textContent = 'No goal set';
    goalMinutes.textContent = '';
    goalProgressBar.style.width = '0%';
    goalProgress.classList.remove('goal-completed');
  }
}

function getTodayTotal() {
  const today = new Date();
  const todayDateString = today.getFullYear() + '-' + 
                        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(today.getDate()).padStart(2, '0');
  
  return activities
    .filter(act => {
      const activityDateString = new Date(act.date).getFullYear() + '-' + 
                               String(new Date(act.date).getMonth() + 1).padStart(2, '0') + '-' + 
                               String(new Date(act.date).getDate()).padStart(2, '0');
      return activityDateString === todayDateString;
    })
    .reduce((sum, act) => sum + act.duration, 0);
}

async function deleteActivity(id) {
  if (confirm('Are you sure you want to delete this activity?')) {
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/activities`, id));
      activities = activities.filter(act => act.id !== id);
      updateUI();
    } catch (error) {
      console.error('Error deleting activity:', error);
      showMessage('Failed to delete activity');
    }
  }
}

function editActivity(id) {
  const activity = activities.find(act => act.id === id);
  activityName.value = activity.name;
  activityCategory.value = activity.category;
  activityDuration.value = activity.duration;
  deleteActivity(id);
  document.getElementById('activitySection').classList.add('active');
  document.querySelector('[data-section="activity"]').classList.add('active');
  activityName.focus();
}

function updateUI() {
  // Update Chart
  const categories = ['math', 'physics', 'chemistry', 'svt', 'philosophy', 'english', 'french', 'arabic'];
  const timeByCategory = categories.map(cat => {
    return activities
      .filter(act => act.category === cat)
      .reduce((sum, act) => sum + act.duration, 0);
  });

  if (timeChart) {
    timeChart.data.datasets[0].data = timeByCategory;
    timeChart.update();
  }

  // Update Activity List
  activityList.innerHTML = '<h2>Recent Activities</h2>';
  const recentActivities = activities.slice(-10).reverse();

  if (recentActivities.length === 0) {
    activityList.innerHTML += '<p>No activities logged yet.</p>';
  } else {
    recentActivities.forEach(act => {
      const activityEl = document.createElement('div');
      activityEl.className = 'activity-item';
      activityEl.innerHTML = `
        <div>
          <strong>${act.name}</strong>
          <div class="time-log">${act.category} • ${act.duration} min • ${act.dateString || act.date}</div>
        </div>
        <div class="activity-actions">
          <button class="edit-btn" onclick="editActivity('${act.id}')">Edit</button>
          <button class="delete-btn" onclick="deleteActivity('${act.id}')">Delete</button>
        </div>
      `;
      activityList.appendChild(activityEl);
    });
  }
  
  updateProgressBar();
}

// Event Listeners
toggleLink.addEventListener('click', toggleAuthMode);

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const identifier = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!identifier || !password) {
    showMessage('Please fill in all fields');
    return;
  }

  if (password.length < 6) {
    showMessage('Password must be at least 6 characters long');
    return;
  }

  if (isSignUp) {
    if (await signUp(identifier, password)) {
      // Success handled in signUp function
    }
  } else {
    if (await login(identifier, password)) {
      // Success handled in login function
    }
  }
});

logoutBtn.addEventListener('click', logout);

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  themeToggle.textContent = document.body.classList.contains('dark-mode') ? '🌞' : '🌙';
});

document.querySelectorAll('.sidebar-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sidebar-nav button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    btn.classList.add('active');
    document.getElementById(btn.dataset.section + 'Section').classList.add('active');
  });
});

activityDuration.addEventListener('input', () => {
  if (parseInt(activityDuration.value) < 1) {
    activityDuration.value = 1;
  }
});

setGoalBtn.addEventListener('click', () => {
  const goal = parseInt(dailyGoalInput.value);
  if (goal >= 1) {
    dailyGoal = goal;
    saveUserData();
    updateProgressBar();
    showMessage(`Daily goal set to ${goal} minutes!`, 'success');
  } else {
    showMessage('Please enter a valid goal (minimum 1 minute)');
  }
});

exportBtn.addEventListener('click', () => {
  if (activities.length === 0) {
    showMessage('No data to export yet!');
    return;
  }
  
  const csvHeader = 'Activity Name,Category,Duration (minutes),Date\n';
  const csvData = activities.map(act => 
    `"${act.name}","${act.category}",${act.duration},"${act.date}"`
  ).join('\n');
  
  const blob = new Blob([csvHeader + csvData], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesight-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
});

logActivityBtn.addEventListener('click', async () => {
  if (!activityName.value) {
    showMessage('Please enter an activity name!');
    return;
  }
  
  const duration = parseInt(activityDuration.value);
  if (duration < 1) {
    showMessage('Duration must be at least 1 minute!');
    activityDuration.value = 1;
    return;
  }

  const newActivity = {
    name: activityName.value,
    category: activityCategory.value,
    duration: duration,
    date: new Date().toISOString(),
    dateString: new Date().toLocaleString()
  };

  try {
    // Save to Firestore
    const docRef = await addDoc(collection(db, `users/${currentUser.uid}/activities`), newActivity);
    
    // Add to local array with the document ID
    activities.unshift({ id: docRef.id, ...newActivity });
    
    // Update UI
    updateUI();
    
    // Reset form
    activityName.value = '';
    activityDuration.value = 1;
    showMessage('Activity logged successfully!', 'success');
  } catch (error) {
    console.error('Error logging activity:', error);
    showMessage('Failed to log activity');
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loadUserData();
      showApp();
    } else {
      loginContainer.style.display = 'flex';
      appContainer.classList.remove('active');
    }
  });
});

// Make functions available globally for inline event handlers
window.deleteActivity = deleteActivity;
window.editActivity = editActivity;
