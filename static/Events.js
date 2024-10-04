var files = new FormData();
const fileInput = document.getElementById('fileInput');
const fileContainer = document.getElementById('fileContainer');
const fileTemplate = document.getElementById('fileTemplate').content;

// logs the current files for debugging
function printFiles(){
  for (let [key, value] of files.entries()) {
    console.log(`key value pairs: ${key}: ${value}`);
  }
}

// 
function createClone(file){
  const clone = document.importNode(fileTemplate, true);
  clone.querySelector('.file-name').textContent = file.name;
  clone.querySelector('.file-size').textContent = `${(file.size / 1024).toFixed(2)} KB`;
  // selecting material logic
  clone.querySelector('.materialSelect').addEventListener('change', function(event){
    printFiles()
    files.set(file.name, event.target.value)
    printFiles()
  })
  // delete button logic
  clone.querySelector('.deleteButton').addEventListener('mousedown', function(event) {
    // delete the file from the formdata
    printFiles()
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
    printFiles()
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

  fileContainer.appendChild(clone)
}

document.getElementById('addButton').addEventListener('mousedown',function(event) {
  const file = fileInput.files[0];
  let isDuplicate = false;

  if (file == undefined){
    window.alert("Please select a file before attempting to add")
    return
  }
  console.log(file)
  printFiles()
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
    return
  }

  files.append("file", file);
  files.append(file.name, "noMaterial");
  createClone(file)
});

document.getElementById('uploadButton').addEventListener('mousedown',function(event) {

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    printFiles()
    fetch('http://localhost:5000/upload', {
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
        document.getElementById('plotImage').src = data.image;
        console.log(data.message)
        document.getElementById('graphData').innerHTML = data.message;
      })
      .catch(error => console.error('Error:', error));
  });