const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');


const app = express();


app.use(session({
    secret: 'tubelight',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname,'public')));

mongoose.connect('mongodb://0.0.0.0:27017/authDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Could not connect to MongoDB:', error));


const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/home.html');
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname +'/public/signup.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname +'/public/login.html');
});

app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/public/home.html'); // Update with the correct path
});

app.get('/indiandish', isAuthenticated, (req, res) => {
    res.sendFile(__dirname + '/public/indiandish.html'); // Update with the correct path
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect(`/login?message=email already exist!!`);

        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();
         req.session.isLoggedIn = true;
         req.session.username = newUser.username; 
        res.redirect(`/?message=User signed up successfully!!`);
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(400).redirect('/signup?message=Error creating account');
    }
});



app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (user && await bcrypt.compare(req.body.password, user.password)) {
            console.log('Session before setting:', req.session); 
           
            req.session.isLoggedIn = true;
            req.session.username = user.username; 
            
            res.redirect('/?message=User Logged In Successfully');
        } else {
            res.redirect('/login?message=Invalid email or password');
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.send('Server error');
    }
});

app.post('/admin-login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Attempting to log in with username: ${username}`);

    if (username === 'admin' && password === 'admin123') {
        req.session.isAdminLoggedIn = true; // Set session on successful login
        console.log('Admin logged in successfully');
        res.redirect('/adminpage.html?message=Admin logged in successfully');
    } else {
        console.log('Invalid login attempt');
        res.redirect('/adminlogin.html?message=Invalid username or password');
    }
});
app.post('/admin-logout', (req, res) => {
    req.session.isAdminLoggedIn = false; // Set admin session to false
    res.redirect('/?message=Admin Successfully logged out'); // Redirect to login page
});

app.get('/adminpage.html', (req, res) => {
    console.log('Checking admin access...');
    console.log(`Admin login status: ${req.session.isAdminLoggedIn}`);
    
    if (req.session.isAdminLoggedIn) {
        res.sendFile(path.join(__dirname, 'adminpage.html'));
    } else {
        res.redirect('/adminlogin.html?message=You must be logged in as an admin to access this page');
    }
});


app.post('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out. Please try again.'); // Handle error
        }
        // Redirect to the login page with a success message
        res.redirect('/?message=User Successfully logged out'); // Adjust as needed
    });
});



function isAuthenticated(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/?message=Please log in.....');
}
app.get('/check-auth', (req, res) => {
    if (req.session.isLoggedIn) {
        return res.json({ loggedIn: true });
    }
    return res.json({ loggedIn: false });
});


app.get('/api/items', async (req, res) => {
    try {
      const items = await User.find({});
      res.json(items);
    } catch (error) {
      res.status(500).send(error);
    }
  });

app.get('/api/check-login-status', (req, res) => {
    if (req.session && req.session.isLoggedIn) {
        res.json({ isLoggedIn: true, username: req.session.username });
    } else {
        res.json({ isLoggedIn: false });
    }
});



const PORT = 330;
const LOCAL_IP = '192.168.1.x';
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server is running on http://192.168.20.199:${PORT}`);
//  });
