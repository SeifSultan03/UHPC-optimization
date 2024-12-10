var user = null
const saveButton = document.getElementById('save-button');
const updatePasswordButton = document.getElementById('save-button-password')

let fullName = document.getElementById("material-name-input")
let email = document.getElementById("material-density-input")
let oldPasswordInput = document.getElementById('password-old-input')
let newPasswordInput = document.getElementById('password-new-input')

saveButton.addEventListener('mousedown',function(event) {
  let userName = document.getElementById("material-name-input").value
  let userEmail = document.getElementById("material-density-input").value

  const refToAdd = database.ref("users/" + user.uid);

  const newData = {
      ["email"]: userEmail,
      ["full_name"]:userName
  };

  refToAdd.update(newData)
  .then(() => {
    console.log("Data updated successfully.");
    showPopup("Updated Succesfully")
  })
  .catch((error) => {
    alert("Error updating data:", error);
  });
});

updatePasswordButton.addEventListener('mousedown', function(event){
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, oldPasswordInput.value);

  user.reauthenticateWithCredential(credential).then(() => {
  // Reauthentication successful, update the password
    user.updatePassword(newPasswordInput.value).then(() => {
      console.log("Password updated successfully.");
      showPopup()
    }).catch((error) => {
      console.error("Error updating password:", error);
    });
  }).catch((error) => {
    alert("Incorrect Password", error);
  });
})

function populateDisplay(userMaterialsObject){
  console.log(userMaterialsObject.full_name)
  console.log(fullName)
  fullName.value = userMaterialsObject.full_name
  email.value = userMaterialsObject.email
}

auth.onAuthStateChanged(function(u) {
  user = u
  if (user != null) {
    var userMaterialsRef = database.ref("users/"+user.uid)
    userMaterialsRef.once('value').then((snapshot) => {
      let userMaterialsObject = snapshot.val()
      populateDisplay(userMaterialsObject)
    });
  } 
});

function showPopup(text) {
  document.getElementById("popup").style.display = "flex";
}


function hidePopup() {
  location.reload()
}

