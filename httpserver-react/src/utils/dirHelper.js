import axios from 'axios'


export const getFiles = async (path) => {
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
    const res = await axios.get("/api/files?path=" + path);
    // console.log("res.data: ", res.data);
    return res.data
}


export const getRelDir = (path) => {
    console.log("getRelDir")
    if (path !== null && path !== undefined && path.length > 0) {
        return path + "/"
    }
    else {
        return "/"
    }
}