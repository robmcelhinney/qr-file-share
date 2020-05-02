const myConstClass = require('./src/constants.js');
const http = require('http');
const url = require('url');
const fs = require('fs');
const util = require('util');
const path = require('path');
let mime = require('mime-types');
let archiver = require('archiver');
const express = require('express'),
    app = express(),
    port = process.argv[2] || 9000,
    cors = require("cors");

app.use(cors());
app.listen(port, () => console.log("Backend server live on " + port));


const readdir = util.promisify(fs.readdir);

const base_dir = __dirname;

app.get('/api/files', async (req, res) => {
    let dir
    console.log("req.query: ", req.query)
    if (req.query.path && req.query.path !== "undefined") {
        dir = base_dir + '/' + req.query.path
    }
    else {
        console.log("__dirname: ", __dirname)
        dir = __dirname
    }
    console.log("dir: ", dir)
    listDir( dir).then(results => {
        res.send(results)
        console.log("success");
    })
    .catch(err => {
        console.log("error", err);
        res.sendStatus(501)
    });
})


async function listDir(dir) {
    let jsonResult = {}
    console.log("listDir");
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
        console.log("isDirectory file_path: ", file_path);
        if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
            is_dir = true
            console.log("isDirectory file: ", file);
        }


        jsonResult[file] = is_dir
        // res.write('<li><a href="' + rel_dir + "/" + file + '">' + file_name_relative + '</a></li>')
    });
    console.log("jsonResult: ", jsonResult)
    return jsonResult
}


app.get('/api/download', async (req, res) => {
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
    console.log("downloadFile")
    console.log("file: ", file)
    

    let file_path = __dirname + '\\' + file
    if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
        is_dir = true
        // console.log("isDirectory file: ", file);
    }


    // let readStream = fs.createReadStream(file_path);
    // // We replaced all the event handlers with a simple call to readStream.pipe()
    // readStream.pipe(res);

    res.download(file_path)
}


app.get('/api/downloadDir', async (req, res) => {
    const dir = req.query.dir;
    await zipDir(__dirname, dir, res).then((output_path) => {
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
    // const output_path = rel_directory + '\\' + dir + '.zip'
    // let output = fs.createWriteStream(output_path)
    let archive = archiver('zip', {
      zlib: { level: myConstClass.COMPRESSION_LEVEL } // Sets the compression level.
    });

    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    // output.on('close', function() {
    //     console.log(archive.pointer() + ' total bytes')
    //     console.log('archiver has been finalized and the output file descriptor has closed.');
    //     console.log("finalized archive: close output")
    //     res.download(output_path)
    // });

    // This event is fired when the data source is drained no matter what was the data source.
    // It is not part of this library but rather from the NodeJS Stream API.
    // @see: https://nodejs.org/api/stream.html#stream_event_end
    // output.on('end', function() {
    //     console.log('Data has been drained. Zipped up.')
    // });

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
        if (err.code === 'ENOENT') {
            // log warning
            console.log('Zipping error. ENOENT.')
        } else {
            // throw error
            throw err
        }
    });

    // good practice to catch this error explicitly
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



// http.createServer(function (req, res) {
//     console.log(`${req.method} ${req.url}`);

//     // parse URL
//     const parsedUrl = url.parse(req.url);

//     // extract URL path
//     // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
//     // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
//     // by limiting the path to current directory only
//     const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
//     let pathname = path.join(__dirname, sanitizePath);


//     let rel_dir = ""
//     console.log("pathname: ", pathname)
//     if (req.url === "/" || fs.lstatSync(pathname).isDirectory()) {
//         console.log("no req yet or dir")
//         if (req.url === "/") {
//             console.log("__dirname: ", __dirname)
//             let resDir = __dirname
//             console.log("resDir: ", resDir)
//             res.setHeader('content-type', 'text/html')




//             // let jsonData = {};




//             fs.readdir(resDir, (err, files) => {
//                 files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
//                 files.forEach(file => {


//                     console.log("file: ", file);
//                     let fileRelative = path.relative(resDir, file)
//                     let file_name_relative = fileRelative

//                     // Is directory?
//                     let file_path = resDir + '\\' + file
//                     if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
//                         file_name_relative += "/"
//                         // console.log("isDirectory file: ", file);
//                     }


//                     // jsonData[file] = fileRelative;
//                     res.write('<li><a href="' + fileRelative + '">' + file_name_relative + '</a></li>')
//                 });

//                 // console.log("jsonData: ", jsonData)


//                 res.end()
//               });
//         }
//         else {
//         //     console.log("else ")
//         //     console.log("start_dir_name: ", start_dir_name)
//             rel_dir = pathname.replace(start_dir_name, "")
//             let resDir = pathname
//             // console.log("rel_dir: ", rel_dir)
//             // console.log("resDir: ", resDir)
//             // console.log("pathname: ", pathname)



//             // let jsonData = {};


//             res.setHeader('content-type', 'text/html')
//             fs.readdir(resDir, (err, files) => {
//                 files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
//                 files.forEach(file => {
//                     // jsonData[file] = rel_dir + "/" + file;
//                     let file_name_relative = file;

                    
//                     // Is directory?
//                     let file_path = resDir + '\\' + file
//                     if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
//                         file_name_relative += "/"
//                         // console.log("isDirectory file: ", file);
//                     }



//                     res.write('<li><a href="' + rel_dir + "/" + file + '">' + file_name_relative + '</a></li>')
//                 });
//                 // console.log("jsonData: ", jsonData)
 


//                 res.end()
//               });
//         }

//     }
//     else {

//         fs.exists(pathname, function (exist) {
//             if(!exist) {
//             // if the file is not found, return 404
//             res.statusCode = 404;
//             res.end(`File ${pathname} not found!`);
//             return;
//             }

//             // if is a directory, then look for index.html
//             // if (fs.statSync(pathname).isDirectory()) {
//             // pathname += '/index.html';
//             // }

//             // read file from file system
//             fs.readFile(pathname, function(err, data){
//             if(err){
//                 res.statusCode = 500;
//                 res.end(`Error getting the file: ${err}.`);
//             } else {
//                 // based on the URL path, extract the file extention. e.g. .js, .doc, ...
//                 const ext = path.parse(pathname).ext;
//                 // if the file is found, set Content-type and send data
//                 res.setHeader('Content-type', mime.lookup(ext) || 'text/plain' );
//                 res.end(data);
//             }
//             });
//         });
//     }


// }).listen(parseInt(port));

console.log(`Server listening on port ${port}`);