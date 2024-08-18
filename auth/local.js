const LocalStrategy = require('passport-local').Strategy;
const User = require('../model/user');
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Local Strategy for login
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        // Match user
        const user = await User.findOne({ email: email });
        if (!user) {
            return done(null, false, { message: 'Incorrect Credentials' });
        }

        // Match password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect Credentials' });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
