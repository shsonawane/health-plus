const express = require('express');
const session = require('express-session');
const app = express();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io').listen(server);
const fs = require("fs");
const PythonShell = require('python-shell');
const dbConfig = require("./config/mongodb.json");
const MongoClient = require('mongodb').MongoClient;
const mode   = process.env.NODE_ENV || "development";
const port = process.env.PORT || 3000;
const dbUrl = process.env.DB_URL;

/**
 * Middleware to manage user sessions.
 */
app.use(session({
  secret: 'max',
  resave: false,
  saveUninitialized: false
}));

/**
 * Middleware to serve static files in public folder
 */
app.use(express.static(__dirname + '/public'));

/**
 * Setup EJS dynamic webpage genaration engin.
 */
app.set('view engine', 'ejs');

process.on('uncaughtException', function (err) {
  console.log(" UNCAUGHT EXCEPTION ");
  console.log("[Inside 'uncaughtException' event] ", err.stack, err.message);
  app.get('/error', function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });
});

/**
 * Connect to MongoDB.
 */
const url = dbUrl || `${dbConfig.hostUrl}/${dbConfig.database}?retryWrites=true&w=majority`;
MongoClient.connect(url, function (err, db) {
  console.log("Connecting DB: ", url);
  if (err) throw err;
  db.db(dbConfig.database);
  db.close();
});

/**
 * Start express service.
 */
server.listen(port);
console.log("Enironment: ", mode);
console.log('Open this link in browser to view the site.\n');
console.log('http://localhost:' + port);

/**
 * Fetch user for current session.
 * @param {Express.Request} req    request object.
 * @param {Express.Response} res   response object.
 * @returns {Object}               user object.
 */
function getSessionUser(req, res) {
  let user = req.session.user;
  if(!user) {
    throw new Error("Session Expired");
  }
  return user;
}

/**
 * Start websocket api connection using socket.io.
 */
io.sockets.on('connection', function (socket) {
  //connect
  console.log('Connected: new socket connected');

  //disconnect
  socket.on('disconnect', function (data) {
    console.log('Disconnected sockets');
  });

  //send messages
  socket.on('send message', function (data) {
    io.sockets.emit('new message', data);
    data.timestamp = Date.now();
    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      var dbo = db.db(dbConfig.database);
      var myobj = data;
      dbo.collection("chat").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
      });
    });
  });

  //new user
  socket.on('new user', function (data, callback) {
    callback(true);
    socket.username = data;
  });
});

/**
 * Serve home page of web app.
 */
 app.get('/', function (req, res) {
  res.redirect('/patientLogin');
});

/**
 * Update temperature of user form IoT device.
 */
app.get('/temp', function (req, res) {
  var uname = req.query.user;
  var data = req.query.res;
  io.emit('temp', { value: data + "", uname: uname + "" });
  if (data != -1) {
    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      var dbo = db.db(dbConfig.database);
      var myobj = {
        uname: uname + "",
        data: data + "",
        unit: "°F",
        timestamp: new Date().toString()
      };
      dbo.collection("temperature").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        if (parseFloat(data) > 100.0 || parseFloat(data) < 97.5) {
          dbo.collection("users").findOne({ uname: uname + "" },
            function (err, result) {
              dbo.collection("doctor").find({ "uname": { $in: result.docid } })
                .toArray(function (err, resultDoc) {
                  if (err) throw err;
                  var msg = "From " + uname + ",\nHealth Plus Alert!\nBody Temp: " + data + "\n\n"
                    + "Patient needs Medical Attention.";
                  var phone = [];
                  for (var i = 0; i < resultDoc.length; i++) {
                    if (resultDoc[i].phone) {
                      phone.push(resultDoc[i].phone);
                    }
                  }
                  db.close();
                });
            });
        }
      });
    });
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

/**
 * Fetch temperature details of user to display on IoT device.
 */
app.get('/tempfetch', function (req, res) {
  var user = getSessionUser(req, res);
  var ip = req.session.ip;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var query = { uname: user.uname };
    dbo.collection("temperature").find(query).toArray(function (err, result_temp) {
      if (err) throw err;
      res.render('temp', { user: user, temp: result_temp, ip: ip });
    });
    db.close();
  });
});

/**
 * Update pulse rate of user form IoT device.
 */
app.get('/pulse', function (req, res) {
  var uname = req.query.user;
  var data = req.query.res;
  io.emit('pulse', { value: data + "", uname: uname + "" });
  //MongoDb insert sensor data
  if (data != -1) {
    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      var dbo = db.db(dbConfig.database);
      var myobj = { uname: uname + "", data: data + "", unit: "BPM", timestamp: new Date().toString() + "" };
      dbo.collection("pulse rate").insertOne(myobj, function (err, res) {
        if (err) throw err;
        console.log("1 document inserted");
        if (parseInt(data) > 100 || parseInt(data) < 60) {
          dbo.collection("users").findOne({ uname: uname + "" }, function (err, result) {
            dbo.collection("doctor").find({ "uname": { $in: result.docid } }).toArray(function (err, resultDoc) {
              if (err) throw err;
              var msg = "From " + uname + ",\nHealth Plus Alert!\nPulse Rate : "
                + data + "\n\n" + "Patient needs Medical Attention.";
              var phone = [];
              for (var i = 0; i < resultDoc.length; i++) {
                if (resultDoc[i].phone) {
                  phone.push(resultDoc[i].phone);
                }
              }
              phone = Array.from(new Set(phone));
              var options = {
                host: "sms.ssdindia.com",
                path: "/api/sendhttp.php?authkey=16219A1XqcapeE5ae6efbc&mobiles="
                  + phone + "&message=" + encodeURIComponent(msg) + "&sender=HEALTH&route=1&country=0"
              };
              console.log(options.path);
              http.get(options, function (r) {
                console.log('STATUS: ' + r.statusCode);
              });
              db.close();
            });
          });
        }
      });
    });
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

/**
 * Fetch pulse rate details of user to display on IoT device.
 */
app.get('/pulsefetch', function (req, res) {
  var user = getSessionUser(req, res);
  var ip = req.session.ip;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var query = { uname: user.uname };
    dbo.collection("pulse rate").find(query).toArray(function (err, result_pulse) {
      if (err) throw err;
      res.render('pulse', { user: user, pulse: result_pulse, ip: ip });
    });
    db.close();
  });
});

/**
 * Fetch ecg details of user to display on IoT device.
 */
app.get('/ecgfetch', function (req, res) {
  var user = getSessionUser(req, res);
  var ip = req.session.ip;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var query = { uname: user.uname };
    dbo.collection("ecg_diagnosis").find(query).toArray(function (err, result_ecg) {
      if (err) throw err;
      res.render('heart', { user: user, ecg: result_ecg, ip: ip });
    });
    db.close();
  });
});

/**
 * Serve generated hrv-ecg image of user to display on the web app.
 */
app.get('/hrv_img', function (req, res) {
  if (!req.session.user) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('NOT FOUND');
  } else {
    var path = __dirname + "/ecg/" + req.query.user + "/" + req.query.ts + "/ecg.png";
    //console.log(path);
    res.sendFile(path);
  }
});

/**
 * ECG serve test API.
 */
app.get('/ecg', function (req, res) {
  var uname = req.query.user;
  var data = req.query.res;
  io.emit('ecg', { value: data, uname: uname + "" });
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

/**
 * Analyze and generate hrv plot image from ECG data using python shell.
 */
app.get('/hrv', function (req, res) {
  var ecg = JSON.parse(req.query.ecg);
  var csv = ecg[0] + "";
  var timestamp = Date.now();
  var uname = getSessionUser(req, res).uname;
  for (var i = 1; i < ecg.length; i++) {
    csv += "\n" + ecg[i];
  }
  var dir = '/tmp/' + uname;
  try {
    fs.statSync(dir);
  } catch (e) {
    fs.mkdirSync(dir);
  }
  dir += "/" + timestamp;

  try {
    fs.statSync(dir);
  } catch (e) {
    fs.mkdirSync(dir);
  }
  fs.writeFile(dir + '/ecg.csv', csv, function (err) {
    if (err) throw err;
    console.log('Saved!');
    var options = {
      mode: 'text',
      pythonOptions: ['-u'],
      args: [dir + '']
    };
    PythonShell.run('ecg/process.py', options, function (err, result) {
      if (err) throw err;
      var json = JSON.parse(result[2].replace(/'/g, '"'));
      MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db(dbConfig.database);
        var myobj = { uname: uname + "", timestamp: timestamp, data: json };
        dbo.collection("ecg_diagnosis").insertOne(myobj, function (err, res1) {
          if (err) throw err;
          console.log("1 document inserted");
          db.close();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(myobj));
        });
      });
    });
  });
});

/**
 * Create new patient user from health plus web app.
 */
app.get('/insert', function (req, res) {
  var fname = req.query.fname;
  var lname = req.query.lname;
  var ename = req.query.ename;
  var uname = req.query.uname;
  var pass1 = req.query.pass1;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var user = {
      fname: fname + "",
      lname: lname + "",
      ename: ename + "",
      uname: uname + "",
      pass1: pass1 + "",
      docid: []
    };
    dbo.collection("users").findOne({ uname: uname + "" }, function (err, result) {
      if (err) throw err;
      console.log(result);
      if (result != null) {
        console.log("Signup Error");
        res.redirect('/patientSignup?err=1');

      } else {
        dbo.collection("users").insertOne(user, function (err, result1) {
          if (err) throw err;
          console.log("1 document inserted");
          db.close();
          res.redirect('/patientLogin');
        });
      }
    });
  });
});

/**
 * Create new doc user from health plus web app.
 */
app.get('/docinsert', function (req, res) {
  var fname = req.query.fname;
  var lname = req.query.lname;
  var ename = req.query.ename;
  var uname = req.query.uname;
  var pass1 = req.query.pass1;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var user = { fname: fname + "", lname: lname + "", ename: ename + "", uname: uname + "", pass1: pass1 + "" };
    dbo.collection("doctor").findOne({ uname: uname + "" }, function (err, result) {
      if (err) throw err;
      console.log(result);
      if (result != null) {
        console.log("Signup Error");
        res.redirect('/doctor/docsignup?err=1');

      } else {
        dbo.collection("doctor").insertOne(user, function (err, result1) {
          if (err) throw err;
          console.log("1 document inserted");
          db.close();
          res.redirect('/doctor/doclogin');
        });
      }
    });

  });

});

/**
 * Connect web app with IoT device.
 */
app.get('/connect', function (req, res) {
  var user = getSessionUser(req, res);
  var ip = req.query.ip;
  var options = {
    host: ip + '',
    path: '/connect?uname=' + user.uname
  };
  http.get(options, function (r) {
    console.log('STATUS: ' + r.statusCode);
    console.log('HEADERS: ' + JSON.stringify(r.headers));
    req.session.ip = ip;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }).on('error', function (e) {
    req.session.ip = null;
    console.log("Got error: " + e.message);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Error');
  });
});

/**
 * Fetch profile page details of doctor user.
 */
app.get('/docprof', function (req, res) {
  var uname = req.query.duname;
  var user = getSessionUser(req, res).uname;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("users").findOne({ uname: user }, function (err, result_user) {
      if (err) throw err;
      dbo.collection("doctor").findOne({ uname: uname }, function (err, result) {
        if (err) throw err;
        var query = { from: user, to: uname };
        dbo.collection("chat").find(query).toArray(function (err, result_chat1) {
          if (err) throw err;
          var query = { from: uname, to: user };
          dbo.collection("chat").find(query).toArray(function (err, result_chat2) {
            var result_chat = result_chat1.concat(result_chat2);
            result_chat.sort(function (a, b) {
              return parseFloat(a.timestamp) - parseFloat(b.timestamp);
            });
            if (err) throw err;
            if (result) {
              res.render('docprof', { doc: result, user: result_user, chat: result_chat });
            } else {
              console.log("Doctor Not Found!");
            }
            db.close();
          });
        });
      });
    });
  });
});

/**
 * Fetch profile page details of patient user.
 */
app.get('/patientprof', function (req, res) {
  var uname = req.query.puname;
  var user = getSessionUser(req, res).uname;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("users").findOne({ uname: uname }, function (err, result) {
      if (err) throw err;
      var query = { uname: uname };
      dbo.collection("temperature").find(query).toArray(function (err, result_temp) {
        if (err) throw err;
        var query = { uname: uname };
        dbo.collection("pulse rate").find(query).toArray(function (err, result_pulse) {
          if (err) throw err;
          dbo.collection("ecg_diagnosis").find(query).toArray(function (err, result_ecg) {
            if (err) throw err;

            var patname = result.uname;
            var query = { from: user, to: patname };
            dbo.collection("chat").find(query).toArray(function (err, result_chat1) {
              if (err) throw err;
              var query = { from: patname, to: user };
              dbo.collection("chat").find(query).toArray(function (err, result_chat2) {
                var result_chat = result_chat1.concat(result_chat2);
                result_chat.sort(function (a, b) {
                  return parseFloat(a.timestamp) - parseFloat(b.timestamp);
                });
                if (err) throw err;
                if (result) {
                  res.render('patientprof', {
                    patprof: result,
                    pattemp: result_temp,
                    patpulse: result_pulse,
                    patecg: result_ecg,
                    user: user + "",
                    chat: result_chat
                  });
                } else {
                  console.log("patient Not Found!");
                }
                db.close();
              });
            });
          });
        });
      });
    });
  });
});

/**
 * Fetch user home page details.
 */
app.get('/home', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var ip = req.session.ip;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("users").findOne({ uname: uname }, function (err, result_user) {
      if (err) throw err;
      var query = { uname: user.uname };
      dbo.collection("temperature").find(query).toArray(function (err, result_temp) {
        if (err) throw err;

        dbo.collection("pulse rate").find(query).toArray(function (err, result_pulse) {
          if (err) throw err;

          dbo.collection("ecg_diagnosis").find(query).toArray(function (err, result_ecg) {
            if (err) throw err;

            dbo.collection("doctor").find({}).toArray(function (err, result_doc) {
              if (err) throw err;
              console.log(result_doc);
              res.render('home', { 
                user: result_user, 
                temp: result_temp[result_temp.length - 1], 
                ecg: result_ecg[result_ecg.length - 1], 
                pulse: result_pulse[result_pulse.length - 1], 
                ip: ip, doc: result_doc });
              db.close();

            });
          });
        });
      });
    });

  });
});

/**
 * Fetch doctor users home page details.
 */
app.get('/dochome', function (req, res) {
  if (!req.session.user) {
    console.log("Session Empty");
    res.redirect('/patientLogin');
  } else {
    console.log("Session OK");
    var user = getSessionUser(req, res);
    MongoClient.connect(url, function (err, db) {
      if (err) throw err;
      var dbo = db.db(dbConfig.database);

      var uname = user.uname;
      dbo.collection("users").find({ docid: uname }).toArray(function (err, result_patient) {
        if (err) throw err;
        if (result_patient) {
          res.render('dochome', { patient: result_patient, user: user });
        } else {
          console.log("Patients Not Found!");
        }
        db.close();
      });
    });
  }
});

/**
 * Simple authentication for patient.
 */
app.get('/patientAuth', function (req, res) {
  var uname = req.query.uname;
  var pass = req.query.pass;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("users").findOne({ uname: uname, pass1: pass }, function (err, result) {
      if (err) throw err;
      if (result) {
        req.session.user = result;
        res.redirect('/home');
      } else {
        console.log("Login Error");
        res.redirect('/patientLogin?err=1');
      }
      db.close();
    });
  });
});

/**
 * Simple authentication for doctor.
 */
app.get('/docauth', function (req, res) {
  var uname = req.query.uname;
  var pass = req.query.pass;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("doctor").findOne({ uname: uname, pass1: pass }, function (err, result) {
      if (err) throw err;
      if (result) {
        req.session.user = result;
        var user = result;
        res.redirect('/dochome');
      } else {
        console.log("Login Error");
        res.redirect('/doctor/doclogin?err=1');
      }
      db.close();
    });
  });
});

/**
 * Update password user details.
 */
app.get('/update', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var fname = req.query.fname;
  var lname = req.query.lname;
  var ename = req.query.ename;
  var pass1 = req.query.pass1;
  var dob = req.query.dob;
  var phone = req.query.phone;
  var bg = req.query.bg;
  var weight = req.query.weight;
  var height = req.query.height;
  var disease = req.query.disease;
  var description = req.query.description;

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var myquery = { uname: uname + "" };
    var updatedData = {
      uname: uname, fname: fname, lname: lname, ename: ename, pass1: pass1, dob: dob, phone: phone, bloodgroup: bg,
      weight: weight, height: height, disease: disease, description: description
    };
    var newvalues = { $set: updatedData };
    dbo.collection("users").updateOne(myquery, newvalues, function (err, result) {
      if (err) throw err;
      console.log("1 document updated");

      dbo.collection("users").findOne({ uname: uname }, function (err, result) {

        if (err) throw err;
        req.session.user = result;
        res.redirect('/home');
        db.close();

      });
    });
  });
});

/**
 * Update paitent user password.
 */
app.get('/updatepatpass', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var currentpass = req.query.currentpass;
  var newpass = req.query.newpass;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var newvalues = { $set: { pass1: newpass + "" } };

    dbo.collection("users").findOne({ uname: uname, pass1: currentpass }, function (err, result) {

      if (err) throw err;
      if (result) {
        dbo.collection("users").updateOne({ uname: uname }, newvalues, function (err, result) {
          if (err) throw err;
          console.log("1 document updated");
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        });
      } else {
        console.log("Invalid Current Password");
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
      db.close();
    });
  });
});

/**
 * Update doctor user password.
 */
app.get('/updatedocpass', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var currentpass = req.query.currentpass;
  var newpass = req.query.newpass;



  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var newvalues = { $set: { pass1: newpass + "" } };

    dbo.collection("doctor").findOne({ uname: uname, pass1: currentpass }, function (err, result) {

      if (err) throw err;
      if (result) {
        dbo.collection("doctor").updateOne({ uname: uname }, newvalues, function (err, result) {
          if (err) throw err;
          console.log("1 document updated");
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK');
        });
      } else {
        console.log("Invalid Current Password");
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
      db.close();
    });
  });
});

/**
 * Update doctor user details.
 */
app.get('/updatedoc', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var fname = req.query.fname;
  var lname = req.query.lname;
  var ename = req.query.ename;
  var pass1 = req.query.pass1;
  var dob = req.query.dob;
  var phone = req.query.phone;
  var hospital = req.query.hospital;
  var qualification = req.query.qualification;
  var specialization = req.query.specialization;

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var myquery = { uname: uname + "" };
    var updatedData = {
      uname: uname, fname: fname, lname: lname, ename: ename, pass1: pass1, 
      dob: dob, phone: phone, hospital: hospital,
      qualification: qualification, specialization: specialization
    };
    var newvalues = { $set: updatedData };
    dbo.collection("doctor").updateOne(myquery, newvalues, function (err, result) {
      if (err) throw err;
      console.log("1 document updated");

      req.session.user = updatedData;

      res.redirect('/dochome');
      db.close();
    });
  });
});

/**
 * Add doctor to user profile.
 */
app.get('/adddoc', function (req, res) {
  var user = getSessionUser(req, res);
  var uname = user.uname;
  var doctorid = req.query.doctorid;
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    dbo.collection("users").findOne({ uname: uname }, function (err, result) {
      if (result.docid) {
        result.docid.push(doctorid + "");
      } else {
        result.docid = [doctorid];
      }
      dbo.collection("users").updateOne({ uname: uname }, { $set: result }, function (err, r) {
        if (err) throw err;
        req.session.user = result;
        res.redirect('/home');
        db.close();
      });
    });
  });
});

/**
 * Remove doctor from user profile.
 */
app.get('/removedoc', function (req, res) {

  var user = getSessionUser(req, res);
  var doctorid = req.query.doctorid;
  var index = user.docid.indexOf(doctorid);
  if (index > -1) {
    user.docid.splice(index, 1);
  }
  delete user['_id'];

  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(dbConfig.database);
    var myquery = { uname: user.uname + "" };
    var newvalues = { $set: user };
    dbo.collection("users").updateOne(myquery, newvalues, function (err, result) {
      if (err) throw err;
      console.log("1 document updated");

      req.session.user = user;

      res.redirect('/home');
      db.close();
    });
  });
});

/**
 * Logout patient user.
 */
app.get('/logout', function (req, res) {
  req.session.destroy(function () {
    console.log("logout success");
    res.redirect('/patientLogin');
  });
});

/**
 * Logout doctor user.
 */
app.get('/logoutdoc', function (req, res) {
  req.session.destroy(function () {
    console.log("logout success");
    res.redirect('/doctor/doclogin');
  });
});

/**
 * [Test Endpoint]: Check if username exist on sign up.
 */
app.get('/patientSignup', function (req, res) {
  var error = "";
  if (req.query.err == 1) {
    error = "username exist!";
  }
  res.render('patientSignup', { error: "" + error });
});

/**
 * [Test Endpoint]:  Check if username for doctor exist on sign up.
 */
app.get('/doctor/docsignup', function (req, res) {
  var error = "";
  if (req.query.err == 1) {
    error = "username exist!";
  }
  res.render('doctor/docsignup', { error: "" + error });
});

/**
 * [Test Endpoint]: patient login error.
 */
app.get('/patientLogin', function (req, res) {
  var error = "";
  if (req.query.err == 1) {
    error = "Login Error, invalid input!";
  }
  res.render('patientLogin', { error: "" + error, success: false, fname: req.session.fname });
});

/**
 * [Test Endpoint]: doctor login error.
 */
app.get('/doctor/doclogin', function (req, res) {
  var error = "";
  if (req.query.err == 1) {
    error = "Login Error, invalid input!";
  }
  res.render('doctor/doclogin', { error: "" + error });
});

/**
 * Not found page.
 */
 app.use((req, res, next) => {
  res.redirect('/404.html');
})

/**
 * Express Error handler.
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.redirect('/');
});