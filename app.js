require('dotenv').config();

const express= require('express');
const session = require('express-session');
const https = require('https');
const bodyParser=require('body-parser');
const bcrypt = require('bcrypt');
const app=express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static('public'));

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://anfjxpwupsezyqtxugln.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)




app.use(session({
    secret: 'your-secret-key', // Should be a long random string in production
    resave: false,
    saveUninitialized: true
  }));

  app.use(express.json()); 
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
      const { data: user } = await supabase.from('Users').select('*').eq('id', id).single();

      if (!user) {
        return done(new Error('User not found'), null);
      }
      
      done(null, user);
    } catch (error) {
      done(error, null);
    }
});

  

app.get('/',(req,res)=>{
    res.sendFile(__dirname + '/home.html');
});

app.get('/login',(req,res)=>{
    res.sendFile(__dirname + '/login.html');
})
app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/sign-up.html');
  });

  app.post('/signup', async (req, res) => {
    const { email, phone, password } = req.body;

    // First, check if the email or phone already exists in the database
    const { data: existingUserByEmail } = await supabase
        .from('Users')
        .select('id')
        .eq('user_email', email)
        .single();

    const { data: existingUserByPhone } = await supabase
        .from('Users')
        .select('id')
        .eq('user_phone', phone)
        .single();

    if (existingUserByEmail || existingUserByPhone) {
        console.log('User already exists.');
        res.send('<script>alert("You have already signed up. Redirecting to login."); window.location.href="/login";</script>');
        return;
    }

    try {
        // If user doesn't exist, then hash the password and continue with the sign up process
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const { data, error } = await supabase
            .from('Users')
            .insert({ user_email: email, user_phone: phone, password: hashedPassword });

        if (error) {
            console.log('Error inserting data:', error.message);
            res.send('Error inserting data.');
        } else {
            res.redirect('/login');
            console.log('Data inserted successfully:', data);
        }
    } catch (error) {
        console.error('Error connecting to Supabase:', error.message);
        res.send('Error connecting to Supabase.');
    }
});


// app.post('/signup', async (req, res) => {
// const { email, phone, password } = req.body;

// try {
//     // Hash the password
//     const saltRounds = 10; // This determines the complexity of the hash. Typically, 10 is a good value.
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     // Insert the data into the 'Users' table in Supabase
//     const { data, error } = await supabase
//         .from('Users')
//         .insert({ user_email: email, user_phone: phone, password: hashedPassword });  // Store hashed password

//     if (error) {
//         console.log('Error inserting data:', error.message);
//         res.send('Error inserting data.');
//     } else {
//         res.redirect('/login');
//         console.log('Data inserted successfully:', data);
//     }
// } catch (error) {
//     console.error('Error connecting to Supabase:', error.message);
//     res.send('Error connecting to Supabase.');
// }
// });

passport.use(new LocalStrategy({
    usernameField: 'EmailOrPhone',
    passwordField: 'Password'
  },
  async (username, password, done) => {
    let user;
    
    try {
        if (isEmail(username)) {
            // Fetch by email
            const { data, error } = await supabase
                .from('Users')
                .select('*')
                .eq('user_email', username)
                .single(); // To get one record

            if (error) {
                console.log('Error fetching user:', error.message);
                return done(null, false, { message: 'Error fetching user.' });
            }
                
            user = data;
        } else if (isPhoneNumber(username)) {
            // Fetch by phone number
            const { data, error } = await supabase
                .from('Users')
                .select('*')
                .eq('user_phone', username)
                .single(); // To get one record

            if (error) {
                console.log('Error fetching user:', error.message);
                return done(null, false, { message: 'Error fetching user.' });
            }
                
            user = data;
            const user_id=user.id;
        } else {
            return done(null, false, { message: 'Invalid email or phone number format.' });
        }

        if (!user) {
            return done(null, false, { message: 'User not found.' });
        }

        // Check password with bcrypt
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Invalid password.' });
            }
        });
    } catch (error) {
        return done(error);
    }
  }
));

  

// passport.use(new LocalStrategy((username, password, done) => {
//     // Fetch user from the database based on username
//     // For example, if using a fictitious User model:
//     User.findOne({ username: username }, (err, user) => {
//         if (err) { 
//             console.log("Error fetching user:", err);
//             return done(err); 
//         }
//         if (!user) {
//             console.log("User not found.");
//             return done(null, false, { message: 'Incorrect username.' });
//         }
//         if (!user.validPassword(password)) { // Replace `validPassword` with your own password verification method
//             console.log("Incorrect password.");
//             return done(null, false, { message: 'Incorrect password.' });
//         }
//         return done(null, user);
//     });
// }));

  app.post('/login', (req, res, next) => {
    console.log("Attempting to authenticate...");
    next();
}, passport.authenticate('local', {
    successRedirect: '/trips',
    failureRedirect: '/login',
    // failureFlash: true
}));


  
// app.post('/login', async (req, res) => {
    // const enteredValue = req.body.EmailOrPhone; 
    // const enteredPassword = req.body.Password;

    // let user;

    // try {
    //     if (isEmail(enteredValue)) {
    //         // Fetch by email
    //         const { data, error } = await supabase
    //             .from('Users')
    //             .select('*')
    //             .eq('user_email', enteredValue)
    //             .single(); // To get one record

    //         if (error) {
    //             console.log('Error fetching user:', error.message);
    //             return res.status(400).send('Error fetching user.');
    //         }
    //         user = data;
    //     } else if (isPhoneNumber(enteredValue)) {
    //         // Fetch by phone number
    //         const { data, error } = await supabase
    //             .from('Users')
    //             .select('*')
    //             .eq('user_phone', enteredValue)
    //             .single(); // To get one record

    //         if (error) {
    //             console.log('Error fetching user:', error.message);
    //             return res.status(400).send('Error fetching user.');
    //         }
    //         user = data;
    //     } else {
    //         return res.status(400).send('Invalid email or phone number format.');
    //     }

    //     if (!user) {
    //         return res.status(401).send('User not found.');
    //     }
    //     const userId = user.id;

    //     req.session.userId = userId;
    //     // Compare the entered password with the hashed password from the database
    //     const isPasswordCorrect = await bcrypt.compare(enteredPassword, user.password);
        
    //     if (!isPasswordCorrect) {
    //         return res.status(401).send('Invalid password.');
    //     }

        
    //     res.redirect('/trips');
        
    // } catch (error) {
    //     console.error('Error:', error.message);
    //     res.status(500).send('Internal Server Error.');
    // }
// });


function isEmail(value) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    return emailRegex.test(value);
}
function isPhoneNumber(value) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(value);
}


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/login');
    }
}

app.use((req, res, next) => {
    console.log("req.user:", req.user);
    next();
});


app.get('/trips',ensureAuthenticated,(req,res)=>{
    const userId = req.user.id;
    console.log(userId)

    res.sendFile(__dirname+'/trips.html');


})

const GOOGLE_API=process.env.GOOGLE_API;

app.post('/trips', ensureAuthenticated, async (req, res) => {
    const userId = req.user.id;
    console.log(userId);

    const dateTime = req.body.dateTime;
    const source = req.body.sourceLocation;
    const destination = req.body.destinationLocation;
    // console.log(dateTime,source,destination);
    const encodedSource = encodeURIComponent(source);
    const encodedDestination = encodeURIComponent(destination);

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodedSource}&destinations=${encodedDestination}&units=metric&key=${GOOGLE_API}`;

    https.get(url, (response) => {
        response.on("data", async (data) => {
            const jsonData = JSON.parse(data.toString());
            console.log('Received data from Google:', jsonData);

            if (jsonData.rows && jsonData.rows[0]) {
                const elements = jsonData.rows[0].elements;
                if (elements && elements[0]) {
                    const distance = elements[0].distance;
                    console.log(distance);
                    // Store data in the Supabase database
                    const { data: storedData, error } = await supabase.from('Trips').insert([
                        { dateTime: dateTime, source: source, destination: destination, distance: distance ? distance.text : "N/A", user_id: userId }
                    ]);

                    if (error) {
                        console.error('Error storing data in Supabase:', error);
                        res.status(500).send(); // Send a 500 status for server error
                    } else {
                        res.redirect('/trips'); // Send a 200 status for success
                    }
                } else {
                    res.status(400).json({ message: 'No data found' });
                }
            } else {
                res.status(400).json({ message: 'Error fetching distance' });
            }
        });
    });
});

app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/'); // or handle the error
        }
        // Clear the session cookie
        res.clearCookie('connect.sid');  // Assuming you're using the default session cookie name
        // Redirect to login
        res.redirect('/login');
    });
});



app.listen(4000,()=>{
    console.log("Server started on port 4000");
})