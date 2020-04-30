const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
var find = require('find')
var mime = require('mime-types')
// you can pass the parameter in the command line. e.g. node static_server.js 3000
const port = process.argv[2] || 9000;

// maps file extention to MIME types
// full list can be found here: https://www.freeformatter.com/mime-types-list.html
// const mimeType = {
//   '.ico': 'image/x-icon',
//   '.html': 'text/html',
//   '.js': 'text/javascript',
//   '.json': 'application/json',
//   '.css': 'text/css',
//   '.png': 'image/png',
//   '.jpg': 'image/jpeg',
//   '.wav': 'audio/wav',
//   '.mp3': 'audio/mpeg',
//   '.svg': 'image/svg+xml',
//   '.pdf': 'application/pdf',
//   '.zip': 'application/zip',
//   '.doc': 'application/msword',
//   '.eot': 'application/vnd.ms-fontobject',
//   '.ttf': 'application/x-font-ttf',
// };

const start_dir_name = __dirname

http.createServer(function (req, res) {
    console.log(`${req.method} ${req.url}`);

    // parse URL
    const parsedUrl = url.parse(req.url);

    // extract URL path
    // Avoid https://en.wikipedia.org/wiki/Directory_traversal_attack
    // e.g curl --path-as-is http://localhost:9000/../fileInDanger.txt
    // by limiting the path to current directory only
    const sanitizePath = path.normalize(parsedUrl.pathname).replace(/^(\.\.[\/\\])+/, '');
    let pathname = path.join(__dirname, sanitizePath);


    let rel_dir = ""
    console.log("pathname: ", pathname)
    if (req.url === "/" || fs.lstatSync(pathname).isDirectory()) {
        console.log("no req yet or dir")
        if (req.url === "/") {
            console.log("__dirname: ", __dirname)
            var resDir = __dirname
            console.log("resDir: ", resDir)
            res.setHeader('content-type', 'text/html')
            fs.readdir(resDir, (err, files) => {
                res.write('<ul>')
                files.forEach(file => {
                    console.log("file: ", file);
                    let fileRelative = path.relative(resDir, file)
                    res.write('<li><a href="' + fileRelative + '">' + fileRelative + '</a></li>')
                });
                res.write('</ul>')
                res.end()
              });
        }
        else {
        //     console.log("else ")
        //     console.log("start_dir_name: ", start_dir_name)
            rel_dir = pathname.replace(start_dir_name, "")
            var resDir = pathname
            // console.log("rel_dir: ", rel_dir)
            // console.log("resDir: ", resDir)
            // console.log("pathname: ", pathname)
            res.setHeader('content-type', 'text/html')
            fs.readdir(resDir, (err, files) => {
                res.write('<ul>')
                files.forEach(file => {
                    res.write('<li><a href="' + rel_dir + "/" + file + '">' + file + '</a></li>')
                });
                res.write('</ul>')
                res.end()
              });
        }

    }
    else {

        fs.exists(pathname, function (exist) {
            if(!exist) {
            // if the file is not found, return 404
            res.statusCode = 404;
            res.end(`File ${pathname} not found!`);
            return;
            }

            // if is a directory, then look for index.html
            // if (fs.statSync(pathname).isDirectory()) {
            // pathname += '/index.html';
            // }

            // read file from file system
            fs.readFile(pathname, function(err, data){
            if(err){
                res.statusCode = 500;
                res.end(`Error getting the file: ${err}.`);
            } else {
                // based on the URL path, extract the file extention. e.g. .js, .doc, ...
                const ext = path.parse(pathname).ext;
                // if the file is found, set Content-type and send data
                res.setHeader('Content-type', mime.lookup(ext) || 'text/plain' );
                res.end(data);
            }
            });
        });
    }


}).listen(parseInt(port));

console.log(`Server listening on port ${port}`);