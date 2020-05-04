export const simplifyParentPath = (path) => {
    if ((path.split("/").length-1) > 1) {
        // remove /.. and parent dir with it. 
        // console.log("simplifyParentPath: ")
        let reverse_path = [...path].reverse().join("")
        reverse_path = reverse_path.substring(reverse_path.indexOf("/") + 1)
        reverse_path = reverse_path.substring(reverse_path.indexOf("/") + 1)
        path = [...reverse_path].reverse().join("")
    }
    else {
        path = ""
    }
    return path
}