const jose = require('jose');

let key = Buffer.from(process.env.JWT_SECRET || "c47dc077-7464-4618-926e-49fdecf3cdbe");

async function validateToken(socket, next){
    try{
        let token = socket.handshake.auth.token;
        const {payload, header} = await jose.jwtVerify(token, key)
        socket.data = {
            username: payload.user_metadata.full_name
        }
        next();
    }catch(err){
        console.log("Middleware -> validateToken -> Error:",err)
        next(new Error('Invalid/Expired Token'));
    }

}

module.exports = validateToken;