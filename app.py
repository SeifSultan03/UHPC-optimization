from UHPC import create_graph
import io
import base64


import os
from flask import Flask
from flask import *

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


#create the upload folder
UPLOAD_FOLDER = 'uploads/'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route('/upload', methods=['POST'])
def upload_file():
    # make sure the filepart is there
    if 'file' not in request.files:
        response = jsonify({"error":"no file part"})
        response.headers.add("Access-Control-Allow-Origin", "*")
        return make_response(response, 400)

    #file = request.files['file']
    print(request.files)

    fileList = request.files.getlist('file');
    for file in fileList:
        # check if its an excel file
        if ".xls" not in file.filename: 
            response = jsonify({"error":"not an excel file"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return make_response(response, 400)
        
        # make sure the filename is not empty
        if file.filename == '':
            response = jsonify({"error":"no selected file"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return make_response(response, 400)
        
        file.material = request.form.get(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.path = file_path
        file.save(file_path)

    graphdata = create_graph(fileList)

    # delete the files from the filelist
    for file in fileList:
        # delete the file so it doesn't stay in storage
        file_path = file.path
        if os.path.isfile(file_path):
            os.remove(file_path) 
            print(f"Successfully deleted {file_path}")
        else:
            print(f"The file {file_path} does not exist.")

    #print(file.filename)
    #print(file.material)
    #print(request.form)
    #print(request.files)


    # encode and send the image
    encoded_img = base64.b64encode(graphdata['img'].getvalue()).decode('utf-8')
    response = jsonify({"message": graphdata['message'], "file_path": file_path, 'image': f'data:image/png;base64,{encoded_img}'})
    response.headers.add("Access-Control-Allow-Origin", "*")
    resp = make_response(response, 200)
    return resp

if __name__ == "__main__":
    app.run(debug=True)

