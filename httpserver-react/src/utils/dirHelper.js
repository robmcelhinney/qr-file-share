import axios from 'axios'


export const getFiles = async (path) => {
    console.log("getFiles: path", path)
    // axios({
    //     method: "GET",
    //     url: "/api/files?path=" + path,
    //     headers: {
    //       "Content-Type": "application/json"
    //     }
    // }).then(res => {
    //     console.log("res.data: ", res.data);
    //     return res.data
    // });
    let res = await axios.get("/api/files?path=" + path);
    console.log("res.data: ", res.data);
    return res.data
}


export const getBaseDir = (path) => {
    console.log("getBaseDir")
    if (path !== null && path !== undefined && path.length > 0) {
        return path + "/"
    }
    else {
        return "/"
    }
}