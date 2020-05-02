import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {File} from './File';

export const Files = () => {

	const [files, setFiles] = useState(Object);
	const [baseDir, setBaseDir] = useState("/");

	useEffect(() => {
        getFiles("")
    }, []);
      
    const getFiles = (path) => {
        if (path !== null && path !== undefined && path.length > 0) {
            console.log("getFiles path: ", path)
            setBaseDir(path + "/")
        }
        else {
            setBaseDir("/")
        }
        axios({
			method: "GET",
			url: "http://localhost:9000/api/files?path=" + path,
			headers: {
			  "Content-Type": "application/json"
			}
		  }).then(res => {
            console.log("res.data: ", res.data);
            setFiles(res.data)
		  });
    }

    const returnToParent = (path) => {
        console.log("returnToParent path: ", path);
        if ((path.split("/").length-1) > 1) {
            // remove /.. and parent dir with it. 
            console.log("do something else: ")
            let reverse_path = [...path].reverse().join("")
            reverse_path = reverse_path.substring(reverse_path.indexOf("/") + 1);
            reverse_path = reverse_path.substring(reverse_path.indexOf("/") + 1);
            path = [...reverse_path].reverse().join("")
        }
        else {
            path = "";
        }
        getFiles(path)
    }

    const returnToCurrent = (path) => {
        return
    }
    
    const parentDir = () => {
        console.log("baseDir: ", baseDir)
        if (baseDir !== "/") {
            return (
                <File file={".."} isDir={true} key={".."} 
                        getFiles={returnToParent} baseDir={baseDir}
                        parentDir={true} currentDir={false}/>
            )
        }
    }
    
    const currentDir = () => {
        return (
            <File file={baseDir} isDir={true} key={baseDir} 
                    getFiles={returnToCurrent} baseDir={baseDir}
                    parentDir={false} currentDir={true}/>
        )
    }

    return (
        <span id={"file-list"}  className={"mb-10 md:mb-8"}>
        {/* <span id={"file-list"}> */}
            {currentDir()}
            {parentDir()}
            {Object.keys(files).map(file => (
                <File file={file} isDir={files[file]} key={file} 
                    getFiles={getFiles} baseDir={baseDir}
                    parentDir={false} currentDir={false}/>
            ))}
        </span>
    );
}