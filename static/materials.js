var user = null
const materialTemplate = document.getElementById('material-template').content;
const addTemplate = document.getElementById('add-template').content;
const fileContainer = document.getElementById('fileContainer');
const saveButton = document.getElementById('save-button');

var editing = ""
var isAddingNew = false

 function createClone(materialName, materialData){
  const clone = document.importNode(materialTemplate, true);
  clone.querySelector('.material-name').textContent = materialName;
  clone.querySelector('.material-density').textContent = materialData.Density;

  clone.querySelector('.deleteButton').addEventListener('mousedown', function(event) {
    if (user != null) {
      console.log("deleting: " + materialName)
      var refToDelete = database.ref("users/"+user.uid+"/materials/"+materialName)
      refToDelete.remove()
      .then(() => {
        console.log("Data deleted successfully.");
        var userMaterialsRef = database.ref("users/"+user.uid+"/materials")
        userMaterialsRef.once('value').then((snapshot) => {
          let userMaterialsObject = snapshot.val()
          populateDisplay(userMaterialsObject)
        });
      })
      .catch((error) => {
        alert("Error deleting data:", error);
      });
    } 
  })

  clone.querySelector('.editButton').addEventListener('mousedown', function(event) {
    isAddingNew = false
    editing = materialName
    showPopup(materialName, materialData)
  })

  fileContainer.appendChild(clone)
}

saveButton.addEventListener('mousedown',function(event) {

  let materialName = document.getElementById("material-name-input").value
  let density = parseFloat(document.getElementById("material-density-input").value)
  const refToAdd = database.ref("users/" + user.uid + "/materials");

  const newMaterial = {
      [materialName]: {
          Density: density,
      }
  };
  
  refToAdd.update(newMaterial)
  .then(() => {
    console.log("Data updated successfully.");
    var userMaterialsRef = database.ref("users/"+user.uid+"/materials")
    userMaterialsRef.once('value').then((snapshot) => {
      let userMaterialsObject = snapshot.val()
      populateDisplay(userMaterialsObject)
    });
  })
  .catch((error) => {
    alert("Error deleting data:", error);
  });
  hidePopup()
});

function populateDisplay(userMaterialsObject){
  Array.from(fileContainer.children).forEach(child => {
    if (child.tagName !== 'TEMPLATE') {
        child.remove();
    }
  });
  for(let [materialName, materialData] of Object.entries(userMaterialsObject)){
    createClone(materialName, materialData)
  }
  const clone = document.importNode(addTemplate, true);
  clone.querySelector('#addButton').addEventListener("mousedown", function(event){
    showPopup("", {Density:""}, true)
  })
  fileContainer.appendChild(clone)
}

auth.onAuthStateChanged(function(u) {
  user = u
  if (user != null) {
    var userMaterialsRef = database.ref("users/"+user.uid+"/materials")
    userMaterialsRef.once('value').then((snapshot) => {
      let userMaterialsObject = snapshot.val()
      populateDisplay(userMaterialsObject)
    });
  } 
});

function showPopup(materialName, materialData, adding) {
  document.getElementById("popup").style.display = "flex";
  document.getElementById("material-name-input").value = materialName
  document.getElementById("material-density-input").value = materialData.Density
  if(adding)
    document.getElementById("material-popup-title").innerHTML = "Add New Material"
  else
    document.getElementById("material-popup-title").innerHTML = "Edit Material"
}

function hidePopup() {
  document.getElementById("popup").style.display = "none";
}