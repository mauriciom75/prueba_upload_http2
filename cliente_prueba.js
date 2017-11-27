const async = require('async');
var fs = require("fs");


var http = require('http');
var argv = require('minimist')(process.argv.slice(2));
//The url we want is `www.nodejitsu.com:1337/`


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

var readable = fs.createReadStream(argv.file);




function enviar ()
{

  var vchunk = [];
  var chunk = {};
  var i =0;
  var termino = false;
  async.whilst( function (callback) {

      if ( total > argv.chunk_size )
        chunk = readable.read(argv.chunk_size);
      else
        chunk = readable.read();

      return ( chunk ? true : false );
    },
    function (callback) {
          console.log("un chunk");

          var start = i * argv.chunk_size;
          var end = start + argv.chunk_size - 1;
          if ( end > total - 1 )
            end = total - 1;

          var options = {
              host: 'localhost',
              path: '/upload/' + argv.file,
              //since we are listening on a custom port, we need to specify it by hand
              port: '7173',
              //This is what changes the request to a POST request
              method: 'POST',
              headers: {'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                        'Content-Type': 'application/octet-stream' }
            };
            


          var req = http.request(options, function(response) {
              var str = '';
              response.on('data', function (chunk) {
                str += chunk;
              });
            
              response.on('end', function () {
                console.log(str);

                if ( str != "Created" )
                {
                  console.log("hubo error");
                  readable.destroy();
                  throw new Error('Error en invocacion');
                }


              });
              i++;


              callback();

            }
          );
                  
          req.write(chunk);
          req.end();
          
    },
    function (err) {
          console.log("fin");
          readable.destroy();
    } 
  );
}


readable.once("readable",function () { return enviar(); } );