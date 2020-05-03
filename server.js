const myConstClass = require('./constants.js');
const http = require('http');
const url = require('url');
const fs = require('fs');
const util = require('util');
const path = require('path');
const archiver = require('archiver');
const fileUpload = require('express-fileupload');
const express = require('express'),
    app = express(),
    port = normalizePort(process.env.PORT || '9000'),
    cors = require("cors");

// app.use(cors());
app.use(fileUpload());
// If want to limit file size add this:
// app.use(fileUpload({
//     createParentPath: true,
//     limits: { 
//         fileSize: 2 * 1024 * 1024 * 1024 //2MB max file(s) size
//     },
// }));



app.listen(port, () => {
    console.log("Backend server live on " + port)
    // get local ip address from https://gist.github.com/sviatco/9054346#gistcomment-1810845
    let address,
    ifaces = require('os').networkInterfaces();
    for (let dev in ifaces) {
        ifaces[dev].filter((details) => details.family === 'IPv4' && details.internal === false ? address = details.address: undefined);
    }

    console.log(address);
});


const readdir = util.promisify(fs.readdir);

const base_dir = process.argv[2] || __dirname;

console.log("__dirname: ", __dirname)
console.log("process.argv[2]: ", process.argv[2])

app.get('/api/files', async (req, res) => {
    let dir
    console.log("/api/files req.query: ", req.query)
    if (req.query.path && req.query.path !== "undefined") {
        dir = base_dir + '/' + req.query.path
    }
    else {
        // console.log("base_dir: ", base_dir)
        dir = base_dir
    }
    // console.log("dir: ", dir)
    listDir( dir).then(results => {
        res.send(results)
        // console.log("success");
    })
    .catch(err => {
        console.log("error browsing files", err);
        res.sendStatus(501)
    });
})


async function listDir(dir) {
    let jsonResult = {}
    // console.log("listDir");
    let rel_dir = ""
    let files

    try {
        files = await readdir(dir);
    } catch (err) {
        console.log(err)
    }
    files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
    files.forEach(file => {
        jsonResult[file] = rel_dir + "/" + file
        let is_dir = false

        
        // Is directory?
        let file_path = dir + '\\' + file
        // console.log("isDirectory file_path: ", file_path);
        if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
            is_dir = true
            // console.log("isDirectory file: ", file);
        }


        jsonResult[file] = is_dir
        // res.write('<li><a href="' + rel_dir + "/" + file + '">' + file_name_relative + '</a></li>')
    });
    // console.log("jsonResult: ", jsonResult)
    return jsonResult
}


app.get('/api/download', async (req, res) => {
    console.log("/api/download")
    const file = req.query.file
    downloadFile(file, res).then(() => {
        // res.send(results)
        console.log("success")
    })
    .catch(err => {
        console.log("error", err)
        res.sendStatus(501)
    });
})


async function downloadFile(file, res) {
    console.log("downloadFile file: ", file)
    
    let file_path = base_dir + '\\' + file
    if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
        is_dir = true
        // console.log("isDirectory file: ", file);
    }

    res.download(file_path)
}


app.get('/api/downloadDir', async (req, res) => {
    const dir = req.query.dir;
    console.log("downloadDir. dir: ", dir)
    await zipDir(base_dir, dir, res).then((output_path) => {
        // res.send(results)
        console.log("success downloadDir")
    })
    .catch(err => {
        console.log("error", err)
        res.sendStatus(501)
    });
})


async function zipDir(rel_directory, dir, res) {
    console.log("rel_directory:  ", rel_directory)
    console.log("dir:  ", dir)
    
    let archive = archiver('zip', {
      zlib: { level: myConstClass.COMPRESSION_LEVEL } // Sets the compression level.
    });

    archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
            // log warning
            console.log('Zipping error. ENOENT.')
        } else {
            // throw error
            throw err
        }
    });

    archive.on('error', function(err) {
        throw err
    });

    res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=" + dir + ".zip"
    });

    // pipe archive data to the result
    archive.pipe(res)
    archive.directory(rel_directory + '/' + dir, dir)
    
    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize()
    console.log("finalized archive")
}

app.post('/api/upload', async (req, res) => {
    console.log("/api/upload.")

    uploadFile(req, res).then(() => {
        // res.send(results)
        console.log("upload success")
    })
    .catch(err => {
        console.log("upload error", err)
        res.sendStatus(501)
    });
})


async function uploadFile(req, res) {
    console.log("uploadFile req.files: ", req.files)

    try {
        if(!req.files) {
            console.log("!req.files")
            res.send({
                status: false,
                message: 'No file uploaded'
            });
        } else {
            let file = req.files.file;
            
            //Use the mv() method to place the file in upload directory (i.e. "uploads")
            file.mv(base_dir + '\\' + file.name);

            //send response
            res.send({
                status: true,
                message: 'File is uploaded',
                data: {
                    name: file.name,
                    mimetype: file.mimetype,
                    size: file.size
                }
            });
        }
    } catch (err) {
        res.status(500).send(err);
    }
};



/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);
  
    if (isNaN(port)) {
      // named pipe
      return val;
    }
  
    if (port >= 0) {
      // port number
      return port;
    }
  
    return false;
  }