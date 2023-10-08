require('dotenv').config();

const express= require('express');
const session = require('express-session');
const https = require('https');
const bodyParser=require('body-parser');
const bcrypt = require('bcrypt');
const app=express();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const google = require('googleapis');
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


});

// app.get('/trips/user', ensureAuthenticated, async (req, res) => {
//     const userId = req.user.id;
  
//     try {
//       // Fetch trips for the logged-in user using Supabase
//       const { data: trips, error } = await supabase
//         .from('Trips')
//         .select('*')
//         .eq('user_id', userId);
  
//       if (error) {
//         console.error('Error fetching trips from Supabase:', error);
//         res.status(500).json({ message: 'Error fetching trips' });
//       } else {
//         // Send the trips data to the client-side JavaScript
//         res.status(200).json(trips);
//       }
//     } catch (error) {
//       console.error('Server error:', error);
//       res.status(500).json({ message: 'Server error' });
//     }
//   });

app.get('/trips/user', ensureAuthenticated, async (req, res) => {
    const userId = req.user.id;
    
    try {
      // Check if the logged-in user is an admin (you need to have a field in the user table to determine this)
      const { data: loggedInUser } = await supabase
        .from('Users')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (loggedInUser) {
        if (loggedInUser.is_admin==='yes') {
          // If the logged-in user is an admin, fetch all trips
          const { data: trips, error } = await supabase
            .from('Trips')
             .select('*, user_id(Users:user_email)');
             
          // .eq('is_admin', 'no');
            // .select('*');
            // .select('Trips:*, Users:user_name')
            // .select('*, user_id (Users:user_name)')
            // .select('*, (select user_name from Users where Users.id = Trips.user_id) as user_name')
            // .eq('Users:id', supabase.from('Users').select('id').eq('is_admin', 'no'));
          if (error) {
            console.error('Error fetching all trips from Supabase:', error);
            res.status(500).json({ message: 'Error fetching trips' });
          } else {
            // Send all trips data to the client-side JavaScript
            res.status(200).json(trips);
          }
        } else {
          // If the logged-in user is not an admin, fetch only their trips
          // const { data: trips, error } = await supabase
          // .from('Trips')
          // .select('*, user_id(Users:user_email)')
          // .not('user_id', 'is', null)
          // .match({ 'user_id.Users.id': userId });

          // Step 1: Fetch the logged-in user's user_id
          // const { data: loggedInUser, error: userError } = await supabase
          // .from('Users')
          // .select('id')
          // .eq('id', userId)
          // .single();

          // if (userError) {
          // console.error('Error fetching user from Supabase:', userError);
          // res.status(500).json({ message: 'Error fetching user' });
          // } else if (!loggedInUser) {
          // res.status(404).json({ message: 'User not found' });
          // } else {
          // // Step 2: Fetch the trips of the logged-in user along with user_email
          // const user_id = loggedInUser.id;

          // const { data: trips, error: tripsError } = await supabase
          //   .from('Trips')
          //   .select('*, Users:user_email')
          //   .eq('user_id', user_id);

          // if (tripsError) {
          //   console.error('Error fetching trips from Supabase:', tripsError);
          //   res.status(500).json({ message: 'Error fetching trips' });
          // } else {
          //   // Send the user's trips data with user_email to the client-side JavaScript
          //   res.status(200).json(trips);
          // }
          // }
          const { data: trips, error } = await supabase
          .from('Trips')
          .select('*, Users:user_email')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching trips from Supabase:', error);
          res.status(500).json({ message: 'Error fetching trips' });
        } else {
          // Send the user's trips data with user_email to the client-side JavaScript
          res.status(200).json(trips);
        }


          // if (error) {
          //   console.error('Error fetching trips from Supabase:', error);
          //   res.status(500).json({ message: 'Error fetching trips' });
          // } else {
          //   // Send the user's trips data to the client-side JavaScript
          //   res.status(200).json(trips);
          // }
        }
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });




  app.get('/trips/usersdata', ensureAuthenticated, async (req, res) => {
    const userId = req.user.id;
  
    try {
      // Check if the logged-in user is an admin (you need to have a field in the user table to determine this)
      const { data: loggedInUser } = await supabase
        .from('Users')
        .select('is_admin')
        .eq('id', userId)
        .single();
  
      if (loggedInUser && loggedInUser.is_admin === 'yes') {
        // If the logged-in user is an admin, fetch all users
        const { data: users, error } = await supabase
          .from('Users')
          .select('*')
          .eq('id', userId);
  
        if (error) {
          console.error('Error fetching all users from Supabase:', error);
          res.status(500).json({ message: 'Error fetching users' });
        } else {
          // Send all users data to the client-side JavaScript
          res.status(200).json(users);
        }
      } else {
        res.status(403).json({ message: 'Permission denied' });
      }
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

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

// // Google Sheets API setup
// const sheets = google.sheets('v4');
// const sheetsClient = new google.auth.JWT({
//   keyFile: 'your-service-account-key.json', // Replace with your service account key file
//   scopes: ['https://www.googleapis.com/auth/spreadsheets'],
// });

// // Define a function to export data to Google Sheets
// async function exportToGoogleSheets(data) {
//   try {
//     await sheets.spreadsheets.values.append({
//       auth: sheetsClient,
//       spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
//       range: 'Sheet1', // Replace with the sheet name you want to update
//       valueInputOption: 'RAW',
//       insertDataOption: 'INSERT_ROWS',
//       resource: {
//         values: data,
//       },
//     });

//     const sheetLink = `https://docs.google.com/spreadsheets/d/${'YOUR_SPREADSHEET_ID'}`;
//     return sheetLink;
//   } catch (error) {
//     console.error('Error exporting data to Google Sheets:', error);
//     throw error;
//   }
// }

// app.post('/exportToGoogleSheets', async (req, res) => {
//   try {
//     const dataToExport = req.body.data;
//     const sheetLink = await exportToGoogleSheets(dataToExport);

//     // Send the sheet link as a response
//     res.send(`Data export started. You can access the Google Sheet <a href="${sheetLink}" target="_blank">here</a>.`);
//   } catch (error) {
//     console.error('Error exporting data:', error);
//     res.status(500).send('Error exporting data to Google Sheets.');
//   }
// });


app.listen(4000,()=>{
    console.log("Server started on port 4000");
})