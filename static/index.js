var firebaseConfig = {
    apiKey: "AIzaSyDeJPmAwzvf2cdEI84ivsV2xAPKO_zB7PM",
    authDomain: "uhpc-optimization.firebaseapp.com",
    projectId: "uhpc-optimization",
    storageBucket: "uhpc-optimization.appspot.com",
    databaseUrl:"https://uhpc-optimization-default-rtdb.firebaseio.com",
    messagingSenderId: "132424108887",
    appId: "1:132424108887:web:52e19bf2795a27fb48cc12"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth()
const database = firebase.database()

var isLoading = false
auth.onAuthStateChanged(function(user) {
    if (user && !isLoading) {
    console.log('User is authenticated:', user.email);
    window.location = '/main'
    } else {
        console.log("okay, user is not authenticated or loading")
    }
});
  
function register () {
    email = document.getElementById('email').value
    password = document.getElementById('password').value
    full_name = document.getElementById('full_name').value
  
    if (validate_email(email) == false || validate_password(password) == false) {
      alert('Email or Password invalid')
      return
    }
    if (validate_field(full_name) == false) {
      alert('Enter a name please')
      return
    }
   
    auth.createUserWithEmailAndPassword(email, password)
    .then(function() {
      isLoading = true;
      var user = auth.currentUser
      var database_ref = database.ref()
  
      var user_data = {
        email : email,
        full_name : full_name,
        last_login : Date.now(),
        template:{
          particles:{
            start:{
              row:1,
              column:0
            },
            end:{
              row:101,
              column:0
            }
          },
          values:{
            start:{
              row:1,
              column:1
            },
            end:{
              row:101,
              column:1
            }
          }
        },
        sheet_name:"Sheet2",
        tutorial_level:0,
        materials: {
          Cement: {
            Density: 3.15,
            Bounds:{
              lower:[-1],
              upper:[-1]
            },
            Type:"OPC"
          },
          Slag: {
            Density: 2.85,
            Bounds:{
              lower:[0.2],
              upper:[-1]
            },
            Type:"SCM"
          },
          Sand: {
            Density: 2.6,
            Bounds:{
              lower:[1],
              upper:[-1]
            },
            Type:"FA"
          },
          "Silica Fume": {
            Density: 2.2,
            Bounds:{
              lower:[0],
              upper:[0.2]
            },
            Type:"SCM"
          },
          "fly ash": {
            Density: 2.1,
            Bounds:{
              lower:[0],
              upper:[0.2]
            },
            Type:"SCM"
          },
          "metakaolin": {
            Density: 2.6,
            Bounds:{
              lower:[0],
              upper:[0.2]
            },
            Type:"SCM"
          },
        }
      }
  
      // Push to Firebase Database
      console.log(user.uid)
      database_ref.child('users/' + user.uid).set(user_data)
        .then(() =>{
            alert('User Created!!')
            window.location = '/main';
            isLoading = false;
        })
    })
    .catch(function(error) {
      var error_code = error.code
      var error_message = error.message
  
      alert(error_message)
    })
  }
  
  function login () {
    email = document.getElementById('email').value
    password = document.getElementById('password').value
  
    if (validate_email(email) == false || validate_password(password) == false) {
      alert('Email or Password invalid')
      return
    }
  
    auth.signInWithEmailAndPassword(email, password)
    .then(function() {
      isLoading = true;
      var user = auth.currentUser
      var database_ref = database.ref()
  
      var user_data = {
        last_login : Date.now(),
      }
  
      database_ref.child('users/' + user.uid).update(user_data)
      .then(() =>{
        alert('User logged in!!')
        window.location = '/main';
        isLoading = false;
      })
  
    })
    .catch(function(error) {
      //var error_code = error.code
      var error_message = error.message
  
      alert(error_message)
    })
  }
  
  
  
  
  // Validate Functions

  function validate_field(field) {
    console.log(field)
    if (field.length > 3)
      return true
    return false
  }

  function validate_email(email) {
    expression = /^[^@]+@\w+(\.\w+)+\w$/
    if (expression.test(email) == true) {
      return true
    } else {
      return false
    }
  }
  
  function validate_password(password) {
    if (password < 6) {
      return false
    } else {
      return true
    }
  }
  
