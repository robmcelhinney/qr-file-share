import React, {useState, useEffect} from 'react'
import {useDispatch, useSelector} from "react-redux"
import {File} from './File'
import {getFiles, getRelDir} from '../utils/dirHelper'
import {setFiles, setRelDir} from "../js/actions/index.js"
import iconRefresh from '../assets/icons/icon-refresh.svg'
import axios from 'axios'

export const Files = () => {

    const [baseDir, setBaseDir] = useState('')

	const dispatch = useDispatch()

    const files = useSelector(state => state.files)
    const relDir = useSelector(state => state.relDir)

	useEffect(() => {
        setRelDirRefreshFiles("")
    }, [])

    useEffect(() => {
        fetchBaseDir()
      }, [])

    async function fetchBaseDir() {
        const res = await axios.get("/api/baseDir")
        console.log("fetch res.data: ", res.data)
        setBaseDir(res.data)
    }
  
    const setRelDirRefreshFiles = async (path) => {
        console.log("setRelDirRefreshFiles")
        dispatch(setRelDir(getRelDir(path)))
        const files = await getFiles(path)
        dispatch(setFiles(files))
    }

    const refreshFiles = async () => {
        const files = await getFiles(relDir)
        dispatch(setFiles(files))
    }

    const returnToCurrent = (path) => {
        return
    }
    
    const parentDir = () => {
        // console.log("relDir: ", relDir)
        if (relDir !== "/") {
            return (
                <File file={".."} isDir={true} key={".."} 
                        getFiles={setRelDirRefreshFiles}
                        parentDir={true} currentDir={false}/>
            )
        }
    }
    
    const currentDir = () => {
        return (
            <File file={relDir} isDir={true} key={relDir} 
                    getFiles={returnToCurrent}
                    parentDir={false} currentDir={true}/>
        )
    }

    return (
        <div id={"file-list"} 
                className={"mt-4 mb-10 md:mb-8 w-full relative max-w-m " +
                "text-sm md:text-base mt-4"}>
            <span className={"flex"}>
                <span className={"text-gray-500 font-medium ml-8"}>
                    {baseDir}
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
                    getFiles={setRelDirRefreshFiles} parentDir={false} 
                    currentDir={false}/>
            ))}
        </div>
    )
}