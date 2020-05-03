import React, {useEffect} from 'react'
import {useDispatch, useSelector} from "react-redux"
import {File} from './File'
import {getFiles, getBaseDir} from '../utils/dirHelper'
import {setFiles, setBaseDir} from "../js/actions/index.js"
import iconRefresh from '../assets/icons/icon-refresh.svg'
// import axios from 'axios'

export const Files = () => {

	const dispatch = useDispatch()

    const files = useSelector(state => state.files)
    const baseDir = useSelector(state => state.baseDir)

	useEffect(() => {
        setBaseDirRefreshFiles("")
    }, []);

    const setBaseDirRefreshFiles = async (path) => {
        dispatch(setBaseDir(getBaseDir(path)))
        const files = await getFiles(path);
        dispatch(setFiles(files))
    }

    const refreshFiles = async () => {
        const files = await getFiles(baseDir);
        dispatch(setFiles(files))
    }

    const returnToCurrent = (path) => {
        return
    }
    
    const parentDir = () => {
        // console.log("baseDir: ", baseDir)
        if (baseDir !== "/") {
            return (
                <File file={".."} isDir={true} key={".."} 
                        getFiles={setBaseDirRefreshFiles}
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
        <div id={"file-list"} 
                className={"mt-4 mb-10 md:mb-8 w-full relative max-w-m " +
                "text-sm md:text-base"}>
            <span className={"flex"}>
                <span className={"h-5 w-5 md:h-6 md:w-6 ml-2"}>
                    directory
                </span>
                <img src={iconRefresh} alt="Folder" 
                        className={"absolute right-0 text-gray-700 " + 
                            "mr-8 h-5 w-5 md:h-6 md:w-6 cursor-pointer"}
                        onClick={refreshFiles} />
            </span>
            {currentDir()}
            {parentDir()}
            {Object.keys(files).map(file => (
                <File file={file} isDir={files[file]} key={file} 
                    getFiles={setBaseDirRefreshFiles} parentDir={false} 
                    currentDir={false}/>
            ))}
        </div>
    );
}