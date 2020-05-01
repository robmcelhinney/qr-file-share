const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
let mime = require('mime-types')


const port = process.argv[2] || 9000;

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
            let resDir = __dirname
            console.log("resDir: ", resDir)
            res.setHeader('content-type', 'text/html')




            // let jsonData = {};




            fs.readdir(resDir, (err, files) => {
                files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
                files.forEach(file => {


                    console.log("file: ", file);
                    let fileRelative = path.relative(resDir, file)
                    let file_name_relative = fileRelative

                    // Is directory?
                    let file_path = resDir + '\\' + file
                    if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
                        file_name_relative += "/"
                        // console.log("isDirectory file: ", file);
                    }


                    // jsonData[file] = fileRelative;
                    res.write('<li><a href="' + fileRelative + '">' + file_name_relative + '</a></li>')
                });

                // console.log("jsonData: ", jsonData)


                res.end()
              });
        }
        else {
        //     console.log("else ")
        //     console.log("start_dir_name: ", start_dir_name)
            rel_dir = pathname.replace(start_dir_name, "")
            let resDir = pathname
            // console.log("rel_dir: ", rel_dir)
            // console.log("resDir: ", resDir)
            // console.log("pathname: ", pathname)



            // let jsonData = {};


            res.setHeader('content-type', 'text/html')
            fs.readdir(resDir, (err, files) => {
                files = files.filter(item => !(/(^|\/)\.[^\/\.]/g).test(item));
                files.forEach(file => {
                    // jsonData[file] = rel_dir + "/" + file;
                    let file_name_relative = file;

                    
                    // Is directory?
                    let file_path = resDir + '\\' + file
                    if (fs.existsSync(file_path) && fs.lstatSync(file_path).isDirectory()){
                        file_name_relative += "/"
                        // console.log("isDirectory file: ", file);
                    }



                    res.write('<li><a href="' + rel_dir + "/" + file + '">' + file_name_relative + '</a></li>')
                });
                // console.log("jsonData: ", jsonData)
 


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