const express = require('express');
const app = express();
const compression = require('compression');
const cookieSession = require('cookie-session');
const csurf = require('csurf');
const server = require('http').Server(app); 
const io = require('socket.io')(server, { origins: 'localhost:8080' });
const db = require('./sql/db');
const s3 = require('./s3');
const { s3Url } = require('./config');
const multer = require('multer');
const uidSafe = require('uid-safe');
const path = require('path');
const { hash } = require('./bcrypt');

const diskStorage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, __dirname + '/uploads');
    },
    filename: function (req, file, callback) {
        uidSafe(24).then(function (uid) {
            callback(null, uid + path.extname(file.originalname));
        });
    }
});

const uploader = multer({
    storage: diskStorage,
    limits: {
        fileSize: 2097152
    }
});

app.use(compression());
app.use(express.static('./public'));
app.use(express.static('./sql'));
app.use(express.json());

const cookieSessionMiddleware = cookieSession({
    secret: `my secrets`,
    maxAge: 1000 * 60 * 60 * 24 * 90
});

app.use(cookieSessionMiddleware);
io.use(function (socket, next) {
    cookieSessionMiddleware(socket.request, socket.request.res, next);
});

app.use(csurf());
app.use(express.urlencoded({ 
    extended: false
}));

app.use(function (req, res, next) {
    res.cookie('mytoken', req.csrfToken());
    next();
});

if (process.env.NODE_ENV != 'production') {
    app.use(
        '/bundle.js',
        require('http-proxy-middleware')({
            target: 'http://localhost:8082/'
        })
    );
} else {
    app.use('/bundle.js', (req, res) => res.sendFile(`${__dirname}/bundle.js`));
}

app.get('/welcome', (req, res) => {
    if (req.session.userId) {
        res.redirect('/');
    } else {
        res.sendFile(__dirname + '/index.html');
    }
});

app.post('/register', (req, res) => {
    let { first, last, email, password } = req.body;
    if (first != '' && last != '' && email != '' && password != '') {
        hash(password).then(result => {
            password = result;
            db.insertUsers(first, last, email, password).then(result => {
                let id = result.rows[0].id;
                req.session.userId = id;

                res.redirect('/');
            }).catch(error => console.log(error));
        }).catch(error => console.log(error.message));
    } else {
        return res.render('register', { error: true });
    }
});

app.post('/login', (req, res) => {
    let { email, password } = req.body;
    db.getByEmailUser(email).then(result => {
        let hashPassword = result.rows[0].password;
        db.getCheckPassword(password, hashPassword).then(isMatch => {
            if (isMatch) {
                req.session.userId = result.rows[0].id;
                res.redirect('/dashboard');
            } else {
                res.sendStatus(500);
            }
        }).catch(error => {
            console.log(error);
            res.sendStatus(500);
        });
    }).catch(error => {
        console.log(error.message);
        res.sendStatus(500);
    });
});

app.get('/user', async (req, res) => {
    let { userId } = req.session;
    const { rows } = await db.getUserInfo(userId);
    res.json(rows[0]);
});

app.get('/api/user/:id', async (req, res) => {
    let { id } = req.params;
    let { userId } = req.session;
    if (userId != id) {
        const { rows } = await db.getUserInfo(id);
        res.json(rows[0]);
    } else {
        res.sendStatus(500);
    }
});

app.post('/upload', uploader.single('image'), s3.upload, (req, res) => {
    const { userId } = req.session; 
    const url = `${s3Url}${req.file.filename}`;
    db.updateImgUrl(url, userId).then(() => {
        res.json({
            url
        });
    }).catch(error => {
        console.log(error);
        res.sendStatus(500);
    });
});

app.post('/bio', (req, res) => {
    let { textAreaValue } = req.body;
    let { userId } = req.session;
    db.updateUsersBio(textAreaValue, userId).then(({ rows }) => {
        res.json(rows);
    });
});

app.get('/find_recent', (req, res) => {
    db.getRecentUsers().then(({ rows }) => {
        res.json(rows);
    }).catch(error => {
        console.log(error.message);
    });
});

app.get('/find', (req, res) => {
    let { val } = req.query;

    db.getMoreUsers(val).then(({ rows }) => {
        res.json(rows);
    }).catch(error => {
        console.log(error.message);
        res.sendStatus(500);
    });
});

app.get('/get-initial-status/:id', (req, res) => {
    let { userId } = req.session;
    let { id } = req.params;
    db.initFriendShipStatus(userId, id).then(({ rows }) => {
        res.json(rows);
    }).catch((error) => {
        console.log(error);
    });

});

app.post('/send-friend-request/:id', (req, res) => {
    let { userId } = req.session;
    let { id } = req.params;
    db.insertFriendShipIds(userId, id).then(({ rows }) => {
        res.json(rows);
    }).catch((error) => {
        console.log(error);
    });
});

app.post('/accept-friend-request/:id', (req, res) => {
    let { userId } = req.session;
    let { id } = req.params;
    db.updateAcceptColumn(userId, id).then(({ rows }) => {
        res.json(rows);
    });
});

app.post('/end-friendship/:id', (req, res) => {
    let { userId } = req.session;
    let { id } = req.params;
    db.deleteFriendShipRow(userId, id).then(({ rows }) => {
        res.json(rows);
    });
});

app.get('/friends-wannabes', async (req, res) => {
    let { userId } = req.session;
    const { rows } = await db.pendingUsers(userId);
    res.json(rows);
});

app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

// DON'T DELETE !!!!!!!!!!!!!!!!!!!!
app.get('*', (req, res) => {
    if (!req.session.userId) {
        res.redirect('/welcome');
    } else {
        res.sendFile(__dirname + '/index.html');
    }
});

const onlineUsers = {};

io.on('connection', socket => {
    if (!socket.request.session.userId) {
        return socket.disconnect(true);
    }
    const userId = socket.request.session.userId;
    onlineUsers[socket.id] = userId;
    
    const getUnique = (users) => Array.from(new Set(Object.values(users)));
    const uniqueUsers = getUnique(onlineUsers);
    
    io.sockets.emit('onlineUsers', uniqueUsers);

    db.getLastTenMessages().then(({ rows }) => {
        io.sockets.emit('chatMessages', rows.reverse());
    });

    socket.on('chatMessage', newMessage => {
        db.insertUsersMessages(userId, newMessage).then(() => {
            db.getNewMsg(userId).then(({ rows }) => {
                io.sockets.emit('chatMessage', rows);
            });
        });
    });

    socket.on('chatMessageNotitification', () => {
        db.getNewMsg(userId).then(({ rows }) => {
            io.sockets.emit('chatMessageNotitification', rows);
        });
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.sockets.emit('onlineUsers', onlineUsers);
    });

});

server.listen(8080, () => { console.log("I'm listening.");});
