import bcrypt from 'bcrypt';

const password = 'Administrador'; // La contraseña que quieres
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);

console.log('Hash generado:');
console.log(hash);
console.log('\nUsa este hash en MongoDB');