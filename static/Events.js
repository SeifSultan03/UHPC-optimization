var files = new FormData();
const fileInput = document.getElementById('fileInput');
const fileContainer = document.getElementById('fileContainer');
const fileTemplate = document.getElementById('fileTemplate').content;
const uploadForm = document.getElementById("uploadForm")
const resultContainer = document.getElementById("result-container")

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
auth.onAuthStateChanged(function(u) {
  user = u
});
// Initialize Firebase
/*firebase.initializeApp(firebaseConfig);
const auth = firebase.auth()
const database = firebase.database()*/

// logs the current files for debugging
function printFiles(){
  for (let [key, value] of files.entries()) {
    console.log(`key value pairs: ${key}: ${value}`);
  }
}

// 
function createClone(file, materialsObject){
  const clone = document.importNode(fileTemplate, true);
  clone.querySelector('.file-name').textContent = file.name;
  clone.querySelector('.file-size').textContent = `${(file.size / 1024).toFixed(2)} KB`;
  const materialSelect = clone.querySelector('.materialSelect');
  // selecting material logic
  clone.querySelector('.materialSelect').addEventListener('change', function(event){
    files.set(file.name, event.target.value)
  })
  // delete button logic
  clone.querySelector('.deleteButton').addEventListener('mousedown', function(event) {
    // delete the file from the formdata
    let newfiles = new FormData();
    for (let [key, value] of files.entries()) {
      if (key === 'file' && value.name !== file.name){
        console.log(`keeping ${value.name}`)
        newfiles.append(key, value)
      }
      if (key !== 'file' && key !== file.name){
        console.log(`keeping ${key} material: ${value}`)
        newfiles.append(key, value)
      }
    }
    files = newfiles
    // delete the file from the display
    let fileDisplays = fileContainer.querySelectorAll('.file-display')
    for (let item of fileDisplays) {
      const fileName = item.querySelector('.file-name').textContent;
      if (fileName === file.name) {
          item.remove(); 
          break; 
      }
    }
  })

  Array.from(materialSelect.options).forEach((option, index) => {
    if (index !== 0) {
        option.remove();
    }
  });

  // Add new options from materialsObject keys
  Object.keys(materialsObject).forEach(material => {
      const option = document.createElement('option');
      option.textContent = material;
      option.value = material;
      materialSelect.appendChild(option);
  });

  fileContainer.appendChild(clone)
}

document.getElementById('addButton').addEventListener('mousedown',function(event) {

  // go over each file and append it if it's not a duplicate
  if (user != null) {
    var userMaterialsRef = database.ref("users/"+user.uid+"/materials")
    userMaterialsRef.once('value').then((snapshot) => {
      let userMaterialsObject = snapshot.val()
      for (const file of fileInput.files){
        let isDuplicate = false;
        for (let [key, value] of files.entries()) {
          if (key === file.name){
            isDuplicate = true
            break
          }
          if (value.name === file.name){
            isDuplicate = true
            console.log("duplicate")
            break
          }
        }
      
        if(isDuplicate){
          window.alert("attempting to add a duplicate file")
          continue
        }
      
        files.append("file", file);
        files.append(file.name, "noMaterial");
        createClone(file, userMaterialsObject)
      }
    })
  } 
});

Array.from(document.getElementsByClassName('expand-button')).forEach(button =>{
  button.addEventListener('mousedown', function(event){
    console.log(button.parentElement)
    const imageContainer = button.parentElement.querySelector('.image-container');
    const isHidden = imageContainer.style.display === 'none' || !imageContainer.style.display;
    button.textContent = (isHidden ? '▼' : '▶') + button.textContent.slice(1);
    if (imageContainer.style.display === 'none' || imageContainer.style.display === '') {
        imageContainer.style.display = 'block';
    } else {
        imageContainer.style.display = 'none';
    }

  })
})
document.getElementById('uploadButton').addEventListener('mousedown',function(event) {

  for (let [key, value] of files.entries()) {
    if (value === "noMaterial"){
      window.alert("Please pick a material")
      return
    }
  }
  printFiles()
  // http://localhost:5000/upload
  // https://uhpc-optimization-997bd0e79934.herokuapp.com/upload
  fetch('https://uhpc-optimization-997bd0e79934.herokuapp.com/upload', {
      method: 'POST',
      body: files,
    })
    .then(response => {
      response = response.json()
      return response
    })
    .then(data => {
      if (data.error){
          window.alert(data.error)
          return
      }
      document.getElementsByClassName('ExpandableImage')[0].src = data.image;
      console.log(data.graphData)
      document.getElementById('graphData').innerHTML = data.graphData;
      console.log(data.rmseData)
      document.getElementById('rmseData').innerHTML = data.rmseData;
      const element = document.getElementById('graphContainer');
      fetch('https://uhpc-optimization-997bd0e79934.herokuapp.com/getPSD', {
        method: 'POST',
        body: files,
      })
      .then(response => {
        response = response.json()
        return response
      })
      .then(data => {
        if (data.error){
            window.alert(data.error)
            return
        }
        document.getElementsByClassName('ExpandableImage')[1].src = data.image;
        const element = document.getElementById('graphContainer');
        //element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        resultContainer.style.display = 'flex'
        uploadForm.style.display = 'none'
      })
      .catch(error => console.error('Error:', error));
      //element.scrollIntoView({ behavior: 'smooth', block: 'end' });
    })
    .catch(error => console.error('Error:', error));

    
});


/*document.getElementById('psdButton').addEventListener('mousedown',function(event) {

  printFiles()
});*/