const fileInput = document.getElementById('fileInput');
const uploadForm = document.getElementById("uploadForm")
const tableContainer = document.getElementById('selectorTable');
const editContainer = document.getElementsByClassName("editContainer")[0]
const mainContainer = document.getElementById("uploadForm")
const selectedInfoText = document.getElementById("selectedInfoText")
const confirmTab = document.getElementById("confirmTab")
const confirmButton = document.getElementById("confirmButton")
const templateInfoText = document.querySelector("h3")

var user = null
var step = 0;
var refreshOnClick = false;

// Triggers the download of a file (example-template.xlsx) when the "downloadTemplate" element is clicked
document.getElementById("downloadTemplate").addEventListener("click", function() {
    const fileUrl = '/download-template';
    
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = 'example-template.xlsx';
    
    link.click();
});

// Event listener to switch from the main container to the edit container when "customTemplate" is clicked
document.getElementById("customTemplate").addEventListener("click", (event)=>{
  mainContainer.style.display = "none"
  editContainer.style.display = "flex"
})

// Object representing the default template with particle and value data ranges
const newTemplate = {template:{
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
sheet_name:"Sheet2"
}

// Event listener to revert to the default template and update the database
// protects against multiple clicks
document.getElementById("revertTemplate").addEventListener("click", (event)=>{

  const refToUpdate = database.ref("users/" + user.uid);
  refreshOnClick = true
  refToUpdate.update(newTemplate)
    .then(() => {
      showPopup("Reset to default template successfully!")
      console.log("Data updated successfully.");
    })
    .catch((error) => {
      alert("Error updating template:", error);
  });
})

// this holds the sheet name selected to be stored in database
var selectedSheetName = "Sheet2"

// Displays the selected sheet and normalizes its data for table generation
function displaySheet(workbook, sheetName){
  const worksheet = workbook.Sheets[sheetName];        
  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  selectedSheetName = sheetName

  // Generate an HTML table and display it
  const normalizedData = normalizeData(sheetData);
  generateTable(normalizedData);

  showPopup("Step 1: select your cells containing the particle diameters")
  confirmTab.style.display = "flex"
}

// Event listener for file input change to read and process Excel files
fileInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
    if (file) {
      fileInput.style.display = "none"
      editContainer.querySelector("h1").style.display = "none"
      const reader = new FileReader();
      
      reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetNames = workbook.SheetNames;
        let numSheets = workbook.SheetNames.length
        
        if(numSheets > 1){
          // Handle multiple sheets: display buttons for each
          const buttonContainer = document.querySelector("#sheetButtonContainer .buttonContainer");
          buttonContainer.innerHTML = "";

          sheetNames.forEach((name) => {
            const button = document.createElement("button");
            button.className = "sheetButton";
            button.textContent = name;
            button.onclick = () => displaySheet(workbook, name);
            buttonContainer.appendChild(button);
          });

          document.getElementById("sheetButtonContainer").classList.remove("hidden");
        } else {
          // Handle single sheet: directly display the sheet
          const sheetName = workbook.SheetNames[0];
          displaySheet(workbook, sheetName)
        }
        console.log(workbook.SheetNames)
        console.log(workbook.SheetNames.length)
      };

      reader.onerror = function(error) {
        console.error("Error reading file:", error);
      };

      reader.readAsArrayBuffer(file);
    }
});

let selected = [];
let selectedIndex = 0;

// Generates an HTML table from the normalized data
function generateTable(data) {
  tableContainer.innerHTML = "";
  
  for(let i = 0; i < data.length; i++){
    const tr = document.createElement('tr');
    for(let j = 0; j < data[i].length; j++){
      const cell = document.createElement('td');
      let cellData = data[i][j]
      cell.textContent = cellData === undefined ? "" : cellData;

      // Add click event to log the x and y index
      cell.addEventListener('click', () => {
        console.log(`Cell clicked at row: ${i}, column: ${j}`);
        if(cell.classList.contains("selectedCell")){
          cell.classList.remove("selectedCell")
          deleteSelected(false)
          if(arraysEqual(selected[0], [i,j])){
            selected.shift()
          } else {
            selected.pop()
          }
        } else {
          // push start point
          if(selected.length == 0){
            selected.push([i, j])
            cell.classList.add("selectedCell")
          } else if(selected.length == 1){
            //push end point
            if(i == selected[0][0] || j == selected[0][1]){
              // selecting in same row or column = good
              selected.push([i,j])
              cell.classList.add("selectedCell")
              fillSelected()
            } else {
              alert("Please select in the same column or row")
            }
          } else {
            alert("Please select only the start point and endpoint")
          }
          
        }
        updateInfoText()
      });

      tr.appendChild(cell);
    }

    tableContainer.appendChild(tr);
  }
}

// check if 2 arrays are equal
function arraysEqual(arr1, arr2) {
  return arr1.every((value, index) => value === arr2[index]);
}

//Deletes the selected cells' highlighting in the table.
// (isDeletingAll) Whether to delete all selected cells or only filled cells.
function deleteSelected(isDeletingAll){
  if (isDeletingAll) {  
    document.querySelectorAll('.selectedCell, .selectedCellFill').forEach(element => {
      element.classList.remove('selectedCell', 'selectedCellFill');
    });
  } else {
    document.querySelectorAll('.selectedCellFill').forEach(element => {
      element.classList.remove('selectedCellFill');
    });
  }
}

/**
 * Fills the cells between the start and end points in the selected row or column.
 */
function fillSelected(){
  let startPoint = selected[0]
  let endPoint = selected[1]
  let rows = tableContainer.querySelectorAll("tr")

  // check if consistent row or column
  if(startPoint[0] == endPoint[0]){
    // consistent row
    console.log(rows[startPoint[0]].children)
    let row = Array.from(rows[startPoint[0]].children)
    for(let i = (startPoint[1] < endPoint[1] ? startPoint[1] : endPoint[1]) + 1; 
      i < (startPoint[1] < endPoint[1] ? endPoint[1] : startPoint[1]); i++){
        console.log(row[i])
        row[i].classList.add("selectedCellFill");
    }
  } else {
    // consistent column
    for(let i = (startPoint[0] < endPoint[0] ? startPoint[0] : endPoint[0]) + 1; 
      i < (startPoint[0] < endPoint[0] ? endPoint[0] : startPoint[0]); i++){
        rows[i].children[startPoint[1]].classList.add("selectedCellFill")
    }
  }
}

//Normalizes the table data to ensure all rows have equal columns by padding empty cells.
function normalizeData(data) {
  const maxColumns = Math.max(...data.map(row => row.length));

  return data.map(row => {
    while (row.length < maxColumns) {
      row.push("");
    }
    return row;
  });
}

document.querySelector("#close-btn").addEventListener("click", (event)=>{
  hidePopup()
})

//Displays a popup with the given text.
function showPopup(text) {
  document.getElementById("popup").style.display = "flex";
  document.getElementById("material-popup-title").innerHTML = text
}

// Hides the popup and reloads the page if a refresh flag is set.
function hidePopup() {
  document.getElementById("popup").style.display = "none";
  if(refreshOnClick)
    location.reload();
}


//Updates the selected cell information (in the bottom right)
function updateInfoText(){
  confirmButton.style.display = "none"
  if(selected.length == 0){
    selectedInfoText.innerHTML = "Select your cells"
  } else if(selected.length == 1){
    selectedInfoText.innerHTML = "Starting from cell (" + selected[0].map(num => num + 1)+")"
  } else if(selected.length == 2){
    selectedInfoText.innerHTML = "Starting from cell (" + selected[0].map(num => num + 1) + ") to (" + selected[1].map(num => num + 1)+")"
    confirmButton.style.display = "block"
  }
}

let diameters = []

/*
* Confirms the selected cells and adds them to the database (start,end) row and column
*/
confirmButton.addEventListener("click", (event)=>{
  console.log("hello", step)
  if(step == 0){
    // confirm particle diameter
    step++
    showPopup("Step 2: select your cells containing the particle volumes")
    deleteSelected(true)
    diameters = selected
    selected = []
    updateInfoText()
  } else if(step == 1){
    // confirm particle volumes
    step++
    console.log("diameters: " + diameters + " volumes: " + selected)
    const refToUpdate = database.ref("users/" + user.uid);

    const newTemplate = {
        template:{
          particles:{
            start:{
              row:diameters[0][0],
              column:diameters[0][1]
            },
            end:{
              row:diameters[1][0],
              column:diameters[1][1]
            }
          },
          values:{
            start:{
              row:selected[0][0],
              column:selected[0][1]
            },
            end:{
              row:selected[1][0],
              column:selected[1][1]
            }
          }
        },
        sheet_name: selectedSheetName
      };
    
    
    refToUpdate.update(newTemplate)
    .then(() => {
      refreshOnClick = true
      showPopup("Updated Successfully!")
      console.log("Data updated successfully.");
    })
    .catch((error) => {
      alert("Error updating data: ", error);
    });
  }
})

// user loading handling:
// change the text in the middle whether they are using a custom or default template
auth.onAuthStateChanged(function(u) {
  user = u
  if (user != null) {
    var userTemplateRef = database.ref("users/"+user.uid+"/template")
    userTemplateRef.once('value').then((snapshot) => {
      let userTemplateObject = snapshot.val()
      console.log(userTemplateObject)
      console.log(newTemplate.template)
      if(deepEqual(userTemplateObject, newTemplate.template)){
        templateInfoText.innerHTML = "Using Default Template"
      } else {
        templateInfoText.innerHTML = `Particle Diameter Location: 
        [${userTemplateObject.particles.start.row+1}, ${userTemplateObject.particles.start.column+1}] till 
        [${userTemplateObject.particles.end.row+1}, ${userTemplateObject.particles.end.column+1}] <br>
        Particle Volumes Location: 
        [${userTemplateObject.values.start.row+1}, ${userTemplateObject.values.start.column+1}] till 
        [${userTemplateObject.values.end.row+1}, ${userTemplateObject.values.end.column+1}]
        `;
      }
    });
  } 
});

// compare 2 objects, returns true if equal
function deepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== "object" || typeof obj2 !== "object" || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

// steps for the tutorial, all the logic is below
// the steps logic works by having the user tutorial level and highlights the
// element ID based on the step the user is on
const steps = [
  {
    elementId: "downloadTemplate",
    text: "This is our default template we use that you can download",
  },
  {
    elementId: "customTemplate",
    text: "if you already have a specific spreadsheet template that you use for your data, you can always upload it and select your data locations",
  },
  {
    elementId: "revertTemplate",
    text: "If you change your mind, and want to use our default template, theres always the option to do so!",
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
  if(userLevel < 8){
    showStep(userLevel - 5)
  } else {
    document.getElementById("stepOverlay").classList.add("hidden");
  }
}, (1000));