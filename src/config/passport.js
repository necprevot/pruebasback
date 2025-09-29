import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import passport from 'passport';
import dotenv from 'dotenv';
import UserRepository from '../repositories/UserRepository.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET || 'secret_for_dev';

// Instanciar Repository para usar en estrategias
const userRepository = new UserRepository();


export const initializePassport = () => {
    console.log('🔐 [Passport] Inicializando estrategias para evaluación...');

    // Estrategia JWT principal para autenticación
    const jwtOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET,
    };

    passport.use('jwt', new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
        try {
            console.log('🎫 [Passport-JWT] Procesando payload:', {
                id: jwt_payload.id,
                email: jwt_payload.email,
                role: jwt_payload.role
            });
            
            // USAR REPOSITORY para buscar usuario
            const user = await userRepository.findByIdForJWT(jwt_payload.id);
            
            if (!user) {
                console.log('❌ [Passport-JWT] Usuario no encontrado');
                return done(null, false, { message: 'Usuario no encontrado' });
            }
            
            console.log('✅ [Passport-JWT] Usuario autenticado:', user.email);
            return done(null, user);
        } catch (err) {
            console.error('❌ [Passport-JWT] Error en estrategia:', err.message);
            return done(err, false);
        }
    }));

    // Estrategia "current" para endpoint /api/sessions/current
    passport.use('current', new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
        try {
            console.log('👤 [Passport-Current] Validando usuario actual:', jwt_payload.id);
            
            // Validar que el token tiene la información necesaria
            if (!jwt_payload.id) {
                console.log('❌ [Passport-Current] Token inválido - falta ID');
                return done(null, false, { message: 'Token inválido' });
            }
            
            // USAR REPOSITORY para obtener CurrentUserDTO
            // Este método retorna CurrentUserDTO sin información sensible
            const userDTO = await userRepository.getCurrentUser(jwt_payload.id);
            
            if (!userDTO) {
                console.log('❌ [Passport-Current] Usuario no existe');
                return done(null, false, { message: 'Usuario no existe' });
            }
            
            console.log('✅ [Passport-Current] Usuario validado para /current:', userDTO.email);
            
            // Retornar CurrentUserDTO que NO contiene información sensible
            return done(null, userDTO);
        } catch (err) {
            console.error('❌ [Passport-Current] Error en estrategia current:', err.message);
            return done(err, false);
        }
    }));

    console.log('✅ [Passport] Estrategias configuradas correctamente');
    console.log('📋 [Passport] Estrategias disponibles: jwt, current');
};