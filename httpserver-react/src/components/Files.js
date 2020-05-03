import React, {useEffect} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {refreshDir, setBaseDir} from "../js/actions/index.js";
import axios from 'axios';
import {File} from './File';

export const Files = () => {

	const dispatch = useDispatch()

    const files = useSelector(state => state.files)
    const baseDir = useSelector(state => state.baseDir)

	useEffect(() => {
        getFiles("")
    }, []);
      
    const getFiles = (path) => {
        // console.log("getFiles");
        if (path !== null && path !== undefined && path.length > 0) {
            // console.log("getFiles path: ", path)
            dispatch(setBaseDir(path + "/"))
        }
        else {
            dispatch(setBaseDir("/"))
        }
        axios({
			method: "GET",
			url: "/api/files?path=" + path,
			headers: {
			  "Content-Type": "application/json"
			}
            }).then(res => {
                // console.log("res.data: ", res.data);
                dispatch(refreshDir(res.data))
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
                        getFiles={getFiles}
                        parentDir={true} currentDir={false}/>
            )
        }
    }
    
    const currentDir = () => {
        return (
            <File file={baseDir} isDir={true} key={baseDir} 
                    getFiles={returnToCurrent}
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
                    getFiles={getFiles} parentDir={false} 
                    currentDir={false}/>
            ))}
        </div>
    );
}