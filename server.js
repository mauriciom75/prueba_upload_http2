var express = require('express');
var http = require("http");
var fs = require("fs");
var path = require("path");
var url = require('url');
expressLogging = require('express-logging'),
logger = require('logops');


var app = express();
app.use(expressLogging(logger));


app.post('/upload/:nombre',
    function(req,res)
    {
        httpListener(req, res);
    }
);

app.listen(7173);
//http.createServer(httpListener).listen(8000);




function httpListener(req, res) {
    req.respondi = false;
    var stream = null;
    /* Chunked upload sessions will have the content-range header */
    if(req.headers['content-range']) {
        /* the format of content range header is 'Content-Range: start-end/total' */
        var match = req.headers['content-range'].match(/(\d+)-(\d+)\/(\d+)/);
        if(!match || !match[1] || !match[2] || !match[3]) {
            /* malformed content-range header */
            ret.txt = "Error en campo Content-Range";
            ret.status = 500;
            res.status(ret.status).send(ret.txt);
            console.log("header Content-Range con formato incorrecto.");
            return;
        }

        var start = parseInt(match[1]);
        var end = parseInt(match[2]);
        var total = parseInt(match[3]);


        res.header("Range", req.headers['content-range']);
        /* 
         * The filename and the file size is used for the hash since filenames are not always 
         * unique for our customers 
         */

        //var hash = crypto.createHash('sha1').update(filename + total).digest('hex');
        //var target_file = "app/uploads/" + hash + path.extname(filename);
        var target_file = "D:\\temp\\" + req.params.nombre;
        console.log("-------");
        console.log("upload del archivo: " + target_file + " Content-Range:" + req.headers['content-range']);
        
        data_aux = [];
        req.on('data', function (chunk) {
            
            console.log("vino un chunk.");
            data_aux.push(chunk);
        });
        req.on('end', function () {

            data = Buffer.concat(data_aux);

            var size = 0;
            if(fs.existsSync(target_file)) {
                size = fs.statSync(target_file).size;
                console.log("archivo ya existe.");
            }

            console.log("Abro o creo el archivo.");
            /* The individual chunks are concatenated using a stream */  
            stream = fs.createWriteStream(target_file, {flags: 'a+',highWaterMark: 180000});

            var ret = {};
            ret.txt = "";
            ret.status = 200;
            stream.on("close", function cerrar() {
//                stream = null;
                if ( ret.txt == "los datos ya estan en el archivo." )
                {
                    if (!req.respondi)
                    {
                        console.log(ret.txt);
                        res.status(ret.status).send(ret.txt)
                        req.respondi = true;
                    }
                }
                else
                {
                    setTimeout(function() {
                        if (!req.respondi)
                        {
                            console.log(ret.txt);
                            res.status(ret.status).send(ret.txt) 
                            req.respondi = true;
                        }
                    }, 100);
                }
            });
            stream.on("error", function hayerr(err) {
                if (!req.respondi)
                {
                    ret.txt = "error al grabar";
                    ret.status = 500;
                    res.status(ret.status).send(ret.txt) 
                    console.log(ret.txt);
                    if (stream) stream.destroy();
                    req.respondi = true;
                }
                //throw(err);
            });
            /* 
            * basic sanity checks for content range
            */
            
            if((end + 1) <= size) {
                /* duplicate chunk */
                ret.txt = "los datos ya estan en el archivo.";
                ret.status = 201;
                if (stream) stream.destroy();
                return;
            }

            if(start > size) {
                /* missing chunk */
                ret.txt = "faltan datos previos en el archivo";
                ret.status= 400;
                if (stream) stream.destroy();
                return;
            }

            // data2 = {}; // es una referencia, no inicializo.
            if(start < size) {
                /* me están reenviando un chunk */
                console.log("algunos datos ya fueron enviados previamente.");
                /*
                res.send('Algunos datos ya enviados previamente', 400);
                if (stream) stream.end();
                return;
                */

                // el nuevo start sería el size del archivo.
                offset = size - start;
                //data2 = Buffer.from(data,offset);
                data2 = data.slice(offset);
                data = data2;
                start = size;
            }
            
            /* if everything looks good then read this chunk and append it to the target */
            //fs.readFile(req.headers['x-file'], function(error, data) {

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
//            if (data.length > 1e6)
//                request.connection.destroy();

            console.log("voy a grabar (un chunk?) en el archivo.");
            
            function grabar(data2, cb) {
                if (!stream.write(data2)) {
                    console.log("espero evento drain");
                    stream.once('drain', cb);
//                    stream.once('error', cb);
                } else {
                    process.nextTick(cb);
                }
            }


            grabar(data, function grabarfin(err) {

                    if (err)
                    {
                        ret.txt = "Error al grabar en disco";
                        console.log(ret.txt);
                        ret.status= 500;
                        //stream.destroy();
                        //throw err;
                    }

                    if(start + data.length >= total) {
                        ret.txt = "Created. Terminado.";
                        ret.status= 201;
                        stream.destroy();
                    } else {
                        ret.txt = "Created";
                        ret.status= 201;
                        stream.destroy();
                    }

                });

    
        });
/*
        req.on('end', function () {

            console.log("evento de fin de entrada de request. Cierro archivo.");
            res.send("evento de fin de entrada de request. Cierro archivo.", 200);
            if (stream) stream.end();
        });
*/




//            if(error) {
//                res.send('Internal Server Error', 500);
//                return;
//            }


        //});
    } else {
        /* this is a normal upload session */
        //process_upload(req.headers['x-file']);
        res.status(400).send("nada");
        console.log("nada.");
    }

}