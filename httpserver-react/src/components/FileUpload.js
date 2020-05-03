import React, { useRef, useState } from 'react';
import axios from 'axios';
import Dropzone from 'react-dropzone';


export const FileUpload = () => {
    const [file, setFile] = useState(''); // storing the uploaded file    // storing the recived file from backend
    const [data, getFile] = useState({ name: "", path: "" });    
    const [progress, setProgess] = useState(0); // progess bar

    const handleChange = (files) => {
        setProgess(0)
        const newFile = files[0]; // accesing file
        console.log("handleChange. file: ", file);
        setFile(newFile); // storing file
        uploadFile(newFile);
    }

    const uploadFile = (newFile) => {
        const formData = new FormData();        
        formData.append('file', newFile); // appending file
        axios.post('/api/upload', formData, {
            onUploadProgress: (ProgressEvent) => {
                let progress = Math.round(
                ProgressEvent.loaded / ProgressEvent.total * 100) + '%';
                setProgess(progress);
            }
        }).then(res => {
            console.log("uploaded. res: ", res);
            getFile({ name: res.data.name,
                     path: res.data.path
                   })
        }).catch(err => console.log(err))
    }    


    return (
        <div>
            <section className="container">
            <Dropzone onDrop={handleChange}>
                {({ getRootProps, getInputProps }) => (
                <div {...getRootProps({ className: "dropzone" })}>
                    <input {...getInputProps()} />
                    <p>Drag'n'drop files, or click to select files</p>
                </div>
                )}
            </Dropzone>
            <div>
                <strong>Files:</strong>
                <ul>
                {file.name}
                </ul>
            </div>
            <div className="progessBar" style={{ width: progress }}>
            {progress > 0 && progress}
            </div>
            </section>
            {/* <button onClick={uploadFile} className="upbutton">
                Upload
            </button> */}
            <hr />
            {/* displaying received image*/}
            {data.path && <img src={data.path} alt={data.name} />}
        </div>
    );
}