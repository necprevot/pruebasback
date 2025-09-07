import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

export const initializePassport = (passport) => {
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
    passReqToCallback: false
  };

  passport.use('jwt', new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password').populate('cart');
      if (!user) return done(null, false, { message: 'Usuario no encontrado' });
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Opcional: si deseas estrategia local (email/password) también la puedes agregar
};