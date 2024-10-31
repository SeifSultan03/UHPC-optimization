
const username = document.getElementsByClassName('account-name')[0]
var firebaseConfig = {
  apiKey: "AIzaSyDeJPmAwzvf2cdEI84ivsV2xAPKO_zB7PM",
  authDomain: "uhpc-optimization.firebaseapp.com",
  projectId: "uhpc-optimization",
  storageBucket: "uhpc-optimization.appspot.com",
  databaseUrl:"https://uhpc-optimization-default-rtdb.firebaseio.com",
  messagingSenderId: "132424108887",
  appId: "1:132424108887:web:52e19bf2795a27fb48cc12"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth()
const database = firebase.database()
auth.onAuthStateChanged(function(user) {
    if (user) {
      // User is authenticated
      var database_ref = database.ref("users/"+user.uid)
      database_ref.once('value').then((snapshot) => {
        const userData = snapshot.val();
        console.log(username)
        username.innerHTML = userData["full_name"]
        console.log(userData["full"]);
      });
      var database_ref2 = database.ref("users/"+user.uid+"/materials")
      database_ref2.once('value').then((snapshot) => {
        console.log(snapshot.val())

      });
    } else {
      window.location = '/'; 
    }
  });
  
  function logout(){
    auth.signOut().then(() => {
      console.log('User signed out');
      window.location = '/';
    }).catch((error) => {
      console.error('Error signing out:', error);
      alert('An error occurred while logging out. Please try again.');
    });
  }
