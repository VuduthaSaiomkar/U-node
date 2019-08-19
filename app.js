const fabricclient = require('fabric-client')
var fs = require("fs")
const express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var path = require('path')
const fileUpload = require('express-fileupload');
var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');
var bearerToken = require('express-bearer-token');
const enrollModule = require('./enrollment.js')
var transaction = require('./transactions.js')
const queries = require('./query.js')
var busboy = require('connect-busboy');
var formadable = require('formidable');
const defaultsPath = path.resolve(__dirname, 'defaults.json');
const defaultsJSON = fs.readFileSync(defaultsPath, 'utf8');
const defaults = JSON.parse(defaultsJSON);
let port = defaults["Port"] || 4001
const PostUrls = [];
const QueryUrls = [];

/* 
 * Middleware
 */

let app = express();
app.options('*', cors());
app.use(cors());
app.use(fileUpload());
app.use(express.static(path.join(__dirname,'files')))
    //limits: { fileSize: 50 * 1024 * 1024 },
  //}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

//app.use(busboy())
app.listen(port, function(err) {

     var results =enrollModule.enrolladmin();
    if (err) {
        console.log("Cannot start the sever ")
    }
})
app.set('secret', 'newSecret');
app.use(expressJWT({
    secret: 'newSecret'
}).unless({
    path: ['/login', '/register']
}));
app.use(bearerToken());
app.use(function(req, res, next) {
    console.info(' ------>>>>>> new request for %s', req.originalUrl);
    if (req.originalUrl.indexOf('/login') >= 0) {
        return next();
    } else if (req.originalUrl.indexOf('/register') >= 0) {
        return next();
    }

    var token = req.token;
    jwt.verify(token, app.get('secret'), function(err, decoded) {
        if (err) {
            res.send({
                success: false,
                message: 'Failed to authenticate token. Make sure to include the ' +
                    'token returned from /users call in the authorization header ' +
                    ' as a Bearer token'
            });
            return;
        } else {
            req.username = decoded.username;
            req.exp = decoded.exp;
            console.info('Decoded from JWT token: username - %s, expiry - %s', decoded.username, decoded.exp);
            return next();
        }
    });
});

function getErrorMessage(field) {
    var response = {
        success: false,
        message: field + ' field is missing or Invalid in the request'
    };
    return response;
}

app.post('/login', async function(req, res) {
    var username = req.body.username;
    var password = req.body.password;
    console.info('End point : /login');
    console.info('User name : ' + username);
    console.info('Org name  : ' + password);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!password) {
        res.json(getErrorMessage('\'password\''));
        return;
    }
    var token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + parseInt(3600),
        username: username
    }, app.get('secret'));

    let isEnrolled = await enrollModule.enrolluser(username, password)
    if (isEnrolled.success) {
        console.log(username + " logged in")
        isEnrolled.token = token;
        res.status(200).send(isEnrolled)
    } else {
        console.log("user failed to login , register org admin")
        res.status(500).send(isEnrolled)
    }
})

app.post('/logout', async function(req, res) {
    let result = await transaction.logOut(req.username)
    sendResponse(res, result)
})



app.post('/register',async function(req,res){
    var username = req.body.username;
    var password = req.body.password;
    console.info('End point : /login');
    console.info('User name : ' + username);
    console.info('Org name  : ' + password);
    if (!username) {
        res.json(getErrorMessage('\'username\''));
        return;
    }
    if (!password) {
        res.json(getErrorMessage('\'password\''));
        return;
    }
    let results = await enrollModule.registeruser(username,password,'pharma')
    sendResponse(res, results)

})

async function sendResponse(res, result) {
    if (result.success) {
        res.status(200).send(result.message)
    } else {
        res.status(500).send(result.message)
    }
}

app.post("/api/:fcn", async function(req, res) {
    let fcn = req.params.fcn
    let args = req.body.args;
   // let _args = "";
    // if (typeof(args) == typeof([])) {
    //     console.log("message entered");
    //     _args = JSON.stringify(args)
    // }
    let result = await transaction.submitInvoke(req.body.username, fcn, args)
    sendResponse(res, result)
})

app.get("/api/:fcn", async function(req, res) {
    let fcn = req.params.fcn;
    let _args = req.body.args;
    let result = await queries.query(req.body.username, fcn, args)
    sendResponse(res, result)
})

app.post('/upload', function(req, res) {


    // req.pipe(req.busboy)
    // req.busboy.on('file',function(filedname,file,filename){
    //     console.log("filename",filename)
    // })
    // console.log(req);
     
    new  formadable.IncomingForm().parse(req,(err,fields,files)=>{
        console.log(files,fields);
    })
    // console.log(req.body.name);
    // if (Object.keys(req.files).length == 0) {
    //     return res.status(400).send('No files were uploaded.');
    //   }
    
      // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
      //let sampleFile = req.body.sampleFile;      // Use the mv() method to place the file somewhere on your server
    //   sampleFile.mv('/somewhere/on/your/server/filename.jpg', function(err) {
    //     if (err)
    //       return res.status(500).send(err);
    
    //     res.send('File uploaded!');
    //   });
    
  });