var files = new FormData();
const fileInput = document.getElementById('fileInput');
const fileContainer = document.getElementById('fileContainer');
const fileTemplate = document.getElementById('fileTemplate').content;
const uploadForm = document.getElementById("uploadForm")
const resultContainer = document.getElementById("result-container")
const { jsPDF } = window.jspdf;

var firebaseConfig = {
  apiKey: "AIzaSyDeJPmAwzvf2cdEI84ivsV2xAPKO_zB7PM",
  authDomain: "uhpc-optimization.firebaseapp.com",
  projectId: "uhpc-optimization",
  storageBucket: "uhpc-optimization.appspot.com",
  databaseUrl:"https://uhpc-optimization-default-rtdb.firebaseio.com",
  messagingSenderId: "132424108887",
  appId: "1:132424108887:web:52e19bf2795a27fb48cc12"
};

var user = null;
// handle user loading and save the user
// saves the user info to formdata to be sent into backend
auth.onAuthStateChanged(function(u) {
  user = u
  var userInfo= database.ref("users/"+user.uid)
  
  userInfo.once('value').then((snapshot) => {
    let userInfoObject = snapshot.val()
    console.log(userInfoObject)
    files.set("user", JSON.stringify(userInfoObject))
  })
});

// logs the current files for debugging
function printFiles(){
  for (let [key, value] of files.entries()) {
    console.log(`key value pairs: ${key}: ${value}`);
  }
}

//Clones a file template and updates it with file details, material selection, and deletion logic.
function createClone(file, materialsObject) {
  // Clone the template element and update file name and size
  const clone = document.importNode(fileTemplate, true);
  clone.querySelector('.file-name').textContent = file.name;
  clone.querySelector('.file-size').textContent = `${(file.size / 1024).toFixed(2)} KB`;
  
  // Select material dropdown and initialize it with materialsObject options
  const materialSelect = clone.querySelector('.materialSelect');

  // Event listener for material selection
  clone.querySelector('.materialSelect').addEventListener('change', function(event) {
    // Updates the files map with the selected material for the file
    files.set(file.name, event.target.value);
  });

  // Delete button logic
  clone.querySelector('.deleteButton').addEventListener('mousedown', function() {
    // Remove the file from FormData
    let newfiles = new FormData();
    for (let [key, value] of files.entries()) {
      if (key === 'file' && value.name !== file.name) {
        console.log(`keeping ${value.name}`);
        newfiles.append(key, value);
      }
      if (key !== 'file' && key !== file.name) {
        console.log(`keeping ${key} material: ${value}`);
        newfiles.append(key, value);
      }
    }
    files = newfiles;
    
    // Remove the file from the display
    let fileDisplays = fileContainer.querySelectorAll('.file-display');
    for (let item of fileDisplays) {
      const fileName = item.querySelector('.file-name').textContent;
      if (fileName === file.name) {
        item.remove();
        break;
      }
    }
  });

  // Clear existing material options except the first option (placeholder)
  Array.from(materialSelect.options).forEach((option, index) => {
    if (index !== 0) {
      option.remove();
    }
  });

  // Add options from materialsObject keys
  Object.keys(materialsObject).forEach(material => {
    const option = document.createElement('option');
    option.textContent = material;
    option.value = material;
    materialSelect.appendChild(option);
  });

  // Append the cloned template to the file container
  fileContainer.appendChild(clone);
}

// add files button, adds the files to the display and form data (to be sents to backend)
document.getElementById('addButton').addEventListener('mousedown', function(event) {

  if (user != null) {
    var userMaterialsRef = database.ref("users/" + user.uid + "/materials");
    
    userMaterialsRef.once('value').then((snapshot) => {
    let userMaterialsObject = snapshot.val();
    
    for (const file of fileInput.files) {
      let isDuplicate = false;
      
      // Check for duplicate files in FormData
      for (let [key, value] of files.entries()) {
        if (key === file.name || value.name === file.name) {
          isDuplicate = true;
          console.log("duplicate");
          break;
        }
      }
      
      // Alert if the file is a duplicate and skip adding it
      if (isDuplicate) {
        window.alert("attempting to add a duplicate file");
        continue;
      }
      
      files.append("file", file);
      files.append(file.name, "noMaterial");
      
      createClone(file, userMaterialsObject);
    }});
  }
});

// Add toggle functionality to each 'expand-button' to show/hide the image container
Array.from(document.getElementsByClassName('expand-button')).forEach(button => {
  button.addEventListener('mousedown', function() {
    const imageContainer = button.parentElement.querySelector('.image-container');
    const isHidden = imageContainer.style.display === 'none' || !imageContainer.style.display;

    // Toggle button icon and image container visibility
    button.textContent = (isHidden ? '▼' : '▶') + button.textContent.slice(1);
    imageContainer.style.display = isHidden ? 'block' : 'none';
  });
});


// http://localhost:5000/upload
// https://uhpc-optimization-997bd0e79934.herokuapp.com/upload

/**
 * Handles the upload button click to validate materials, send files to the server, and display results.
 * 
 * - Checks if materials are selected for each file.
 * - Sends the files to the server via POST request.
 * - Updates UI with the server's response, including displaying images and data.
 * - Sets up an export button to generate a PDF with the returned data.
 * 
 */
document.getElementById('uploadButton').addEventListener('mousedown', function(event) {

  // Check that each file has an assigned material
  for (let [key, value] of files.entries()) {
    if (value === "noMaterial") {
      window.alert("Please pick a material");
      return;
    }
  }

  // Log files and send them to the server
  printFiles();
  fetch('https://uhpc-optimization-997bd0e79934.herokuapp.com/upload', {
      method: 'POST',
      body: files,
    })
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        window.alert(data.error);
        return;
      }

      // Display the returned image and data
      document.getElementsByClassName('ExpandableImage')[0].src = data.image;
      document.getElementById('graphData').innerHTML = data.graphData;
      document.getElementById('rmseData').innerHTML = data.rmseData;

      // Fetch additional image for PSD data
      fetch('https://uhpc-optimization-997bd0e79934.herokuapp.com/getPSD', {
        method: 'POST',
        body: files,
      })
      .then(response => response.json())
      .then(data2 => {
        if (data2.error) {
          window.alert(data2.error);
          return;
        }

        // Display the second image and update UI
        document.getElementsByClassName('ExpandableImage')[1].src = data2.image;
        resultContainer.style.display = 'flex';
        uploadForm.style.display = 'none';

        // Set up PDF generation with the export button
        document.getElementById("exportButton").addEventListener("click", () => {
          generatePDF(data, data2);
        });
      })
      .catch(error => console.error('Error fetching PSD data:', error));
    })
    .catch(error => console.error('Error uploading files:', error));

  //Generates a PDF with graph and RMSE data.
  function generatePDF(data, data2) {
    const doc = new jsPDF();
    const cleanGraphData = data.graphData.replaceAll("<span>", "").replaceAll("</span>", "");
    const cleanRmseData = data.rmseData.replaceAll("<span>", "").replaceAll("</span>", "");

    doc.setFontSize(16);
    doc.text("Optimal weights with cost scenarios", 10, 20);
    doc.setFontSize(12);
    doc.text(doc.splitTextToSize(cleanGraphData, 180), 10, 30);
    doc.addImage(data.image, 'PNG', 10, doc.internal.pageSize.height - 145, 180, 135);

    doc.addPage();
    doc.text("Optimal RMSE with given bounds", 10, 20);
    doc.text(doc.splitTextToSize(cleanRmseData, 180), 10, 30);
    doc.addImage(data2.image, 'PNG', 10, doc.internal.pageSize.height - 145, 180, 135);

    doc.save("output.pdf");
  }
}); 


// steps for the tutorial, all the logic is below
// the steps logic works by having the user tutorial level and highlights the
// element ID based on the step the user is on
const steps = [
  {
    elementId: "fileInput",
    text: "Welcome! This is the optimization portal, the main page where you will select your separate material files that contain particle diameters and the particle volumes of each material.",
  },
  {
    elementId: "addButton",
    text: "Once you select your files up top, hit add file(s) to add them and select their material.",
  },
  {
    elementId: "uploadButton",
    text: "Once you have added all your files, upload them here to generate graphs and compute the minimum RMSE.",
  },
];

let currentStep = 0;

function showStep(stepIndex) {
  // Remove previous highlights

  document.querySelectorAll(".highlight").forEach((el) => el.classList.remove("highlight"));

  // End tutorial if no more steps
  if (stepIndex >= steps.length) {
    document.getElementById("stepOverlay").classList.add("hidden");
    document.getElementById("stepPopup").classList.add("hidden");
    return;
  }

  console.log(stepIndex)
  const step = steps[stepIndex];
  console.log(step)
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
  if (await getUserTutorialLevel() == 3){
    window.location = "/materials"
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
  if(userLevel < 3){
    showStep(userLevel)
  } else {
    document.getElementById("stepOverlay").classList.add("hidden");
  }
}, (1000));