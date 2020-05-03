import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {File} from './File';

export const Files = () => {

	const [files, setFiles] = useState({"loading": ""});
	const [baseDir, setBaseDir] = useState("/");

	useEffect(() => {
        getFiles("")
    }, []);
      
    const getFiles = (path) => {
        // console.log("getFiles");
        if (path !== null && path !== undefined && path.length > 0) {
            // console.log("getFiles path: ", path)
            setBaseDir(path + "/")
        }
        else {
            setBaseDir("/")
        }
        axios({
			method: "GET",
			url: "/api/files?path=" + path,
			headers: {
			  "Content-Type": "application/json"
			}
		  }).then(res => {
            // console.log("res.data: ", res.data);
            setFiles(res.data)
		  });
    }

    const returnToCurrent = (path) => {
        return
    }
    
    const parentDir = () => {
        // console.log("baseDir: ", baseDir)
        if (baseDir !== "/") {
            return (
                <File file={".."} isDir={true} key={".."} 
                        getFiles={getFiles} baseDir={baseDir}
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
        <div id={"file-list"} className={"mb-10 md:mb-8 w-full max-w-full"}>
        {/* <span id={"file-list"}> */}
            {currentDir()}
            {parentDir()}
            {Object.keys(files).map(file => (
                <File file={file} isDir={files[file]} key={file} 
                    getFiles={getFiles} baseDir={baseDir}
                    parentDir={false} currentDir={false}/>
            ))}
        </div>
    );
}