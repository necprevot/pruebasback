import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import passport from 'passport';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

// Cookie extractor personalizado
const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'] || req.cookies['token'] || req.cookies['accessToken'];
  }
  return token;
};

export const initializePassport = () => {
  // Estrategia JWT desde Bearer Token (Headers)
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
  };

  passport.use('jwt', new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password').populate('cart');
      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Estrategia JWT desde Cookies
  const jwtCookieOptions = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: JWT_SECRET,
  };

  passport.use('jwt-cookie', new JwtStrategy(jwtCookieOptions, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password').populate('cart');
      if (!user) {
        return done(null, false, { message: 'Usuario no encontrado' });
      }
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }));

  // Serialización (si usas sesiones también)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};