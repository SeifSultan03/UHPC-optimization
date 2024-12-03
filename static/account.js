var user = null
const saveButton = document.getElementById('save-button');

let fullName = document.getElementById("material-name-input")
let email = document.getElementById("material-density-input")

saveButton.addEventListener('mousedown',function(event) {
  let materialName = document.getElementById("material-name-input").value
  let density = document.getElementById("material-density-input").value

  const refToAdd = database.ref("users/" + user.uid);

  const newMaterial = {
      ["email"]: density,
      ["full_name"]:materialName
  };
  
  refToAdd.update(newMaterial)
  .then(() => {
    console.log("Data updated successfully.");
    showPopup("Updated Succesfully")
  })
  .catch((error) => {
    alert("Error updating data:", error);
  });
});

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