const async = require('async');
var fs = require("fs");


var http = require('http');
var argv = require('minimist')(process.argv.slice(2));

var md5 = require('md5');


if (!argv.chunk_size)
  argv.chunk_size = 20000;

console.dir(argv);

var size = 0;
if(fs.existsSync(argv.file)) {
    total = fs.statSync(argv.file).size;
} else {
    console.log("archivo no existe.");
    return;
}

var readable = fs.createReadStream(argv.file, {highWaterMark :argv.chunk_size });





  var vchunk = [];
  var chunk = {};
  var pos = 0;
  var termino = false;


  readable.on('data', function (chunk) {

          readable.pause();

          console.log("un chunk, tama: " + chunk.byteLength );

          var start = pos;
          var end = start + chunk.byteLength - 1;
          if ( end > total - 1 )
            end = total - 1;

          // proximo pos
          pos = end + 1;

          var i = 0;
          var intentar = true;
          async.whilst( function () { return intentar },
            function ( callback ) {
              intentar = false;
              var options = {
                  host: 'localhost',
                  path: '/upload/' + argv.file,
                  //since we are listening on a custom port, we need to specify it by hand
                  port: '1880',
                  //This is what changes the request to a POST request
                  method: 'POST',
                  headers: {'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                            'Content-Type': 'application/octet-stream' ,
                            'Content-MD5': md5(chunk) }
                };
                

              i++;
              var req = http.request(options, function(response) {
                  var str = '';
                  response.on('data', function (chunk) {
                    str += chunk;
                  });
                
                  response.on('end', function () {
                    console.log(str);
                    if ( response.statusCode != 201 && response.statusCode != 200)
                    {
                        if ( i <= 3)
                        {
                          console.log ("reintento.");
                          intentar = true;
                        }
                        else
                        {
                          intentar = false;
                          throw new Error("Error en invocación");
                        }

                    }
                    if ( intentar )
                    {
                      setTimeout( function () {
                        //readable.resume(); // si es un reintento no tengo que leer nuevos datos del archivo.
                        return callback();
                      }, 2000 );
                    }
                    else
                    {
                        readable.resume();
                        return callback();
                    }
                  });

                }
              );
/*
              req.on('error', function (err) {

                if ( i <= 3)
                {
                  console.log ("reintento.");
                  intentar = true;
                }
                else
                {
                  intentar = false;
                  throw new Error("Error en invocación");
                }

                if ( intentar )
                {
                  setTimeout( function () {
                    readable.resume();
                    callback();
                  }, 2000 );
                }
                else
                {
                    readable.resume();
                    throw err;
                    callback();
                }

              });

              req.setTimeout(5000, function() {
                req.abort();
              });
*/
              req.write(chunk);
              req.end();
          },
          function () {
            

          }
        );
    } 
  );


readable.resume();