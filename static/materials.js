var user = null
const materialTemplate = document.getElementById('material-template').content;
const addTemplate = document.getElementById('add-template').content;
const fileContainer = document.getElementById('fileContainer');
const saveButton = document.getElementById('save-button');

var editing = ""
var isAddingNew = false

// Function to create a clone of the material template and populate it with data
function createClone(materialName, materialData){
  const clone = document.importNode(materialTemplate, true);
  clone.querySelector('.material-name').textContent = materialName;
  clone.querySelector('.material-density').textContent = materialData.Density;
  if(materialData.Type == "OPC"){
    // OPC
    clone.querySelector('.material-display').style.backgroundColor = "rgb(215 215 215)"
  } else if(materialData.Type == "FA"){
    // FINE AGGREGATE
    clone.querySelector('.material-display').style.backgroundColor = "#e7ddba"
  } else if(materialData.Type == "SCM"){
    // CEMENTATIOUS MATERIAL
  }
  const Bounds = clone.querySelector('.material-bounds');
  if(materialData.Bounds.lower == -1){
    Bounds.innerHTML = "<"+materialData.Bounds.upper
    if(materialData.Bounds.upper == -1){
      // no Bounds at all
      Bounds.innerHTML = "None"
    } else {
      // no lower bound
      Bounds.innerHTML = 0+" - "+materialData.Bounds.upper
    }
  } else if(materialData.Bounds.upper == -1){
    // no upper bound
    Bounds.innerHTML = materialData.Bounds.lower+ " <" 
  } else {
    //both Bounds
    Bounds.innerHTML = materialData.Bounds.lower+" - "+materialData.Bounds.upper
  }

  // delete button logic, delete the material from the database then update the view
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
  
  // edit button logic, it shows the popup and the popup edits the database
  clone.querySelector('.editButton').addEventListener('mousedown', function(event) {
    isAddingNew = false
    editing = materialName
    showPopup(materialName, materialData)
  })

  fileContainer.appendChild(clone)
}

// save button (in the popup), updates the database with new material data
saveButton.addEventListener('mousedown',function(event) {

  let materialName = document.getElementById("material-name-input").value
  let materialType = document.getElementById("material-type").value
  let density = parseFloat(document.getElementById("material-density-input").value)
  let lower = parseFloat(document.getElementById("material-lower-bound-input").value)
  let upper = parseFloat(document.getElementById("material-upper-bound-input").value)
  console.log(lower,upper)
  console.log(isNaN(lower), isNaN(upper))
  const refToAdd = database.ref("users/" + user.uid + "/materials");
  const newMaterial = {
      [materialName]: {
          Density: density,
          Type: materialType,
          Bounds:{
            lower:[isNaN(lower) ? -1 : lower],
            upper:[isNaN(upper) ? -1 : upper]
          },
      }
  };
  
  // update the database
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

// fills the display with the current user's materials
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

// handle user loading and populate the display with the user materials on load
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

// these are the recommended values
const defaultValues = {
  "Sand":[1,-1],
  "Silica Fume":[0,0.2],
  "Slag":[0.2,-1],
  "fly ash":[0,0.2],
  "metakaolin":[0,0.2]
}

var currentMaterialName = ""
// show popup to edit/add new materials
function showPopup(materialName, materialData, adding) {
  document.getElementById("popup").style.display = "flex";
  document.getElementById("material-name-input").value = materialName
  const boundsContainer = document.querySelectorAll(".input_container")[3]
  const recommendedContainer = document.querySelector(".unaligned")
  
  // no need for bounds if Cement as its 1.0 alwas
  if(materialName == "Cement"){
    boundsContainer.style.display = "none"
    recommendedContainer.style.display = "none"
  }
  else{
    boundsContainer.style.display = "flex"
    recommendedContainer.style.display = "block"
  }

  // unkown material (either added by user or cement)
  if(defaultValues[materialName] === undefined){
    recommendBoundsLink.style.display = "none"
  } else {
    recommendBoundsLink.style.display = "block"
    currentMaterialName = materialName
    recommendedContainer.innerHTML = `* The recommended bounds for ${materialName} are 
      ${defaultValues[currentMaterialName][0] == -1 ? "(empty)" : defaultValues[currentMaterialName][0]} - 
      ${defaultValues[currentMaterialName][1] == -1 ? "(empty)" : defaultValues[currentMaterialName][1]}. 
      <a href="#" id="recommendBoundsLink">Use recommended bounds</a>`

    // recomended bounds link logic
    setTimeout(() => {
      const recommendBoundsLink = document.getElementById("recommendBoundsLink");
      if (recommendBoundsLink) {
        recommendBoundsLink.addEventListener("click", (event) => {
          event.preventDefault(); // Prevent the default link behavior
          document.getElementById("material-lower-bound-input").value =
            defaultValues[currentMaterialName][0] == -1 ? "" : defaultValues[currentMaterialName][0];
          document.getElementById("material-upper-bound-input").value =
            defaultValues[currentMaterialName][1] == -1 ? "" : defaultValues[currentMaterialName][1];
        });
      }
    }, 0);
  }

  // if the material has known bounds
  if(materialData.Bounds){
    document.getElementById("material-density-input").value = materialData.Density
    document.getElementById("material-type").value = materialData.Type
    document.getElementById("material-lower-bound-input").value = materialData.Bounds.lower == -1 ? "" : materialData.Bounds.lower
    document.getElementById("material-upper-bound-input").value = materialData.Bounds.upper == -1 ? "" : materialData.Bounds.upper
  } else {
    // set to default
    document.getElementById("material-density-input").value = ""
    document.getElementById("material-type").value = ""
    document.getElementById("material-lower-bound-input").value = ""
    document.getElementById("material-upper-bound-input").value = ""
  }
  if(adding)
    document.getElementById("material-popup-title").innerHTML = "Add New Material"
  else
    document.getElementById("material-popup-title").innerHTML = "Edit Material"
}

// hides the popup from display
function hidePopup() {
  document.getElementById("popup").style.display = "none";
}


// steps for the tutorial, all the logic is below
// the steps logic works by having the user tutorial level and highlights the
// element ID based on the step the user is on
const steps = [
  {
    elementId: "fileContainer",
    text: "This is the material management portal, the place where you can add, edit, or delete materials that you work with.",
  },
  {
    elementId: "addContainer",
    text: "Here is how you add new materials, we already set up some default ones for your use.",
  },
];

let currentStep = 0;

function showStep(stepIndex) {

  document.querySelectorAll(".highlight").forEach((el) => el.classList.remove("highlight"));

  // End tutorial if no more steps
  if (stepIndex >= steps.length) {
    document.getElementById("stepOverlay").classList.add("hidden");
    document.getElementById("stepPopup").classList.add("hidden");
    return;
  }

  const step = steps[stepIndex];
  const element = document.getElementById(step.elementId);

  if (element) {
    element.classList.add("highlight");

    const rect = element.getBoundingClientRect();
    const popup = document.getElementById("stepPopup");
    popup.style.top = `${rect.bottom + window.scrollY + 10}px`;
    popup.style.left = `${rect.left + window.scrollX}px`;

    document.getElementById("stepOverlay").classList.remove("hidden");
    popup.classList.remove("hidden");

    document.getElementById("stepText").innerText = step.text;
  }
}

document.getElementById("nextStep").addEventListener("click",async () => {
  currentStep++;
  await updateUserTutorialLevel()
  if (await getUserTutorialLevel() == 5){
    window.location = "/spreadsheet"
  }
  showStep(currentStep);
});

async function updateUserTutorialLevel() {
  try {
    const userInfo = await getUserTutorialLevel(); 
    await setUserTutorialLevel(userInfo+1); 
  } catch (error) {
    console.error("Error fetching tutorial level:", error);
  }
}

// Start the tutorial
async function getUserTutorialLevel() {
  try {
    // Use await here to get the snapshot value
    const snapshot = await database.ref("users/" + user.uid + "/tutorial_level").once('value');
    return snapshot.val(); // Return the value to resolve the promise
  } catch (error) {
    console.error("Error fetching user tutorial level:", error);
  }
}

async function setUserTutorialLevel(level){
  try {
    await database.ref('users/' + user.uid + "/tutorial_level").set(level);  // Await the Firebase set operation
  } catch (error) {
    console.error("Error setting user tutorial level:", error);
  }
}

setTimeout(async () => {
  let userLevel = await getUserTutorialLevel()
  if(userLevel < 5){
    showStep(userLevel - 3)
  } else {
    document.getElementById("stepOverlay").classList.add("hidden");
  }
}, (1000));