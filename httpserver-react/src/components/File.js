import React from 'react'
import iconFile from '../assets/icons/icon-file.svg'
import iconFolder from '../assets/icons/icon-folder.svg'
import iconArchive from '../assets/icons/icon-archive.svg'

export const File = ({ file, isDir, getFiles, baseDir, parentDir, currentDir }) => {
      
    const downloadLink = () => {
		console.log("baseDir: ", baseDir)
		let path
		if (parentDir) {
			console.log("parentDir: ", parentDir)
			path = baseDir + file
		}
		else if (currentDir) {
			console.log("currentDir: ", currentDir)
			path = baseDir
		}
		else {
			path = baseDir + file
		}
		if (isDir) {
			return (
				<div className={"flex"}>
					{/* Enter dir */}
					{currentDir === false && 
						<img src={iconFolder} alt="Folder" />}
					
					<span onClick={() => getFiles(path)}
							className={"text-gray-700 text-base" + 
							(currentDir === true ? 
							"" : " cursor-pointer") }>
						{file}
					</span>
					{/* Download */}
					<a href={"http://localhost:9000/api/downloadDir?dir=" + path}
							download className={"absolute right-0 " + 
							"text-gray-700 text-base "}>
						<img src={iconArchive} alt="Archive" />
					</a>
				</div>)
		}
		else {
			return (
				<div className={"flex"}>
					<img src={iconFile} alt="File" />
					<a href={"http://localhost:9000/api/download?file=" + path}
							download className={"text-gray-700 text-base"}>
						{file}
					</a>
				</div>
			)
		}
    }

	return (
        <div className={"relative max-w-sm rounded overflow-hidden shadow-lg"}>
			<div className={"px-6 py-4 flex"}>
            	{downloadLink()}
			</div>
        </div>
	);
};