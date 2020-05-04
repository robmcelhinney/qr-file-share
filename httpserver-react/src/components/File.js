import React from 'react'
import {useSelector} from "react-redux";
import iconFile from '../assets/icons/icon-file.svg'
import iconFolder from '../assets/icons/icon-folder.svg'
import iconArchive from '../assets/icons/icon-archive.svg'
import {simplifyParentPath} from '../utils/pathHelper'

export const File = ({ file, isDir, getFiles, parentDir, currentDir }) => {
	  
    const relDir = useSelector(state => state.relDir)	

    const downloadLink = () => {
		let path
		if (parentDir) {
			path = simplifyParentPath(relDir + file)
			// console.log("parentDir true. path: ", path)
		}
		else if (currentDir) {
			// console.log("currentDir: ", currentDir)
			path = relDir
		}
		else {
			path = relDir + file
		}
		if (isDir) {
			return (
				<>
				{/* Enter dir */}
				{currentDir === false && 
					<img src={iconFolder} alt="Folder" 
							className={"h-5 w-5 md:h-6 md:w-6"} />}
				
				<span onClick={() => getFiles(path)}
						className={"text-gray-700 ml-2" + 
						(currentDir === true ? 
						"" : " cursor-pointer") }>
					{file}
				</span>
				{/* Download */}
				<a href={"/api/downloadDir?dir="
						+ path} download 
						className={"absolute right-0 " + 
						"text-gray-700 mr-8"}>
					<img src={iconArchive} alt="Archive" 
							className={"h-5 w-5 md:h-6 md:w-6"}/>
				</a>
				</>)
		}
		else {
			return (
				<>
					<img src={iconFile} alt="File" 
							className={"h-5 w-5 md:h-6 md:w-6"}/>
					<a href={"/api/download?file=" + path}
							download className={"text-gray-700 ml-2"}>
						{file}
					</a>
				</>
			)
		}
    }

	return (
        <div className={"relative rounded overflow-hidden mt-2 border-solid border-2 border-gray-300"}>
			<div className={"px-6 py-4 flex"}>
            	{downloadLink()}
			</div>
        </div>
	);
};