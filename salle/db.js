const sqlite = require('sqlite3');

//? DB CONNECTION
const db = new sqlite.Database('./db/salle.db', sqlite.OPEN_READWRITE, (err) => {
    if (err){
        console.log(err);
    }
});

//? GET COURSES
async function getCourses ({limit = ''} ,callback){
    query = `SELECT * FROM cours ORDER BY id_cours DESC ${limit}`;
    return db.all(query, async(err, rows)=>{
        if (err) return console.log(err);
        return callback(rows)
    });
}

//? ADD NEW USER
async function addUser({nom, prenom, courriel, motDePasse}, callback){
    db.run(`INSERT INTO utilisateur (id_type_utilisateur, nom, prenom, courriel, mot_passe ) VALUES(?,?,?,?,?)`, 
    [1, nom, prenom, courriel, motDePasse], function(err) {
        if (err) {
          return console.log(err.message);
        }
        // get the last insert id
        if (this.lastID)
            callback(true)
        else
            callback(false)
    });
}

//? GET USER
async function getUser({courriel, motDePasse}, callback){
    db.get(`SELECT * FROM utilisateur WHERE courriel = ? AND mot_passe = ?`, [courriel, motDePasse], (err, row) => {
        if (err) {
          return console.error(err.message);
        }
        //...
        if (row) callback(row)
        else callback(false);
      });   
}

//? GET COURS BY USER_ID
async function getCoursesByUserId({userId}, callback){
    return db.all(`SELECT * FROM cours_utilisateur as cu JOIN cours as co ON co.id_cours = cu.id_cours  WHERE cu.id_utilisateur = ?`,
        [userId], async(err, rows)=>{
            if (err) return console.log(err);
                callback(rows)
    });   
}

//? USER DELETE IT COURES
async function deleteCourseByConnectedUser({userId, courseId}, callback){
    return db.run(`DELETE FROM cours_utilisateur WHERE id_cours = ? AND id_utilisateur = ?`, 
        [courseId, userId], function(err, result){
            //CHECK EXCEPTION
            if (err) console.log(err);
            //CALLBACK
            if(this.changes) callback(true);
            else callback(false);
            
        }
    );
}

//? DELETE IF ADMIN
async function deleteCourseByAdmin({courseId}, callback){
    return db.run(`DELETE FROM cours WHERE id_cours = ?`, 
        [courseId], function(err, result){
            //CHECK EXCEPTION
            if (err) console.log(err);
            //CALLBACK
            if(this.changes) callback(true);
            else callback(false);
            
        }
    );
}

//? REIGSTER COURS USER
async function registerCourseByConnectedUser({userId, courseId}, callback){
    db.run(`INSERT INTO cours_utilisateur (id_utilisateur, id_cours) VALUES(?,?)`, 
    [userId, courseId], function(err) {
        //HANDLE LOGS FOR EXCEPTION
        if (err) callback(false); //! IN CASE USER SUBSCRIBE COURSE MANY TIMES
        // get the last insert id
        if (this.lastID) callback(true)
        else callback(false)
    });
}

//? ADD NEW COURSES
async function addNewCourse({nom, description, capacite, dateDebut, nbCours}, callback){
    db.run(`INSERT INTO cours (nom, description, capacite ,date_debut, nb_cours) VALUES(?,?,?,?,?)`, 
    [nom, description, capacite, dateDebut, nbCours], function(err) {
        //HANDLE LOGS FOR EXCEPTION
        if (err) console.log(err); 
        // get the last insert id
        if (this.lastID) callback(true)
        else callback(false)
    });
}

//? GET USERS
async function getUsers (callback){
    query = `SELECT * FROM utilisateur ORDER BY id_utilisateur DESC`;
    return db.all(query, async(err, rows)=>{
        if (err) return console.log(err);
        return callback(rows)
    });
}

module.exports = {
    getCourses, 
    addUser, 
    getUser, 
    getCoursesByUserId,
    deleteCourseByAdmin,
    deleteCourseByConnectedUser,
    registerCourseByConnectedUser,
    addNewCourse,
    getUsers
}
