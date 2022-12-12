//? EXPRESS LIB
const express = require('express');
//? EXPRESS SESSION LIB
const session = require('express-session');
//? HANDLERBARS LIB
const handlebars = require ('express-handlebars');
//? INTERNE DB (CONNECTION & QUERIES)
const sql = require('./db.js');
//? INSTANCE OF EXPRESS
const app = express();
const moment = require('moment');
//? PORT
const port = 3000;

//? SET ENGINE (AND HELPER's)
app.engine('hbs', handlebars.engine({defaultLayout: 'index', extname: '.hbs', helpers:{
    'ifEquals': function(arg1, arg2, options) {
        return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    },
    'formatDate': function(dateString) {
        return moment(dateString).format("YYYY-MM-DD HH:mm a").toUpperCase();
    }
}}));

//? SET HANDLErBARs
app.set('view engine', 'hbs');

//? use JSON
app.use(express.json());
//? use urlEncoded
app.use(express.urlencoded({extended: true}));

//? use SESSION
app.use(session({
    secret: 'mysessions',
    resave: true,
    saveUninitialized: false,
    cookie: {
        expires: new Date('2023-12-30T23:32:21.174Z'),
    },
    expires: new Date('2023-12-30T23:32:21.174Z') 
}));

//* MIDDLEWARE's ****************************************************************
const isUserConnected = (req, res, next) => {
    if (req.session.user){
        return next();
    }

    res.redirect('/');
}
//*******************************************************************************

//* ROUTES **********************************************************************
//? LANDING PAGE ROUTE
app.get('/', (req, res)=>{

    return sql.getCourses({limit: 'LIMIT 6'}, async function(cours) {
        return res.render('index', {
            user: await req.session.user,
            courses: cours,
            layout: false
        });
    })
});

//? COURS ROUTE
app.get('/cours', (req, res)=>{
    return sql.getCourses({limit: ''}, async function(cours) {
        return res.render('cours', {
            user: await req.session.user,
            courses: cours,
            layout: false
        });
    })
});

//? S'INSCRIRE ROUTE
app.post('/sincrire', (req, res)=>{
    //S'INSCRIRE
    return sql.addUser({
        nom: req.body.nom, 
        prenom: req.body.prenom, 
        courriel: req.body.courriel,
        motDePasse: req.body.password,
    },
    async function(status){
        return res.render('index', {
            layout: false,
            callback: status ? {type: 'success', messages: ['S`inscrire avec succès']} 
                            :  {type: 'error', messages: ['n`a pas réussi à s`inscrire']}
        })
    }
    );
});

//? GUARD CONNEXION
app.post('/connexion', (req, res) => {
    return sql.getUser({courriel: req.body.courriel, motDePasse: req.body.password},
        async function(user){
            if (!user){
                return res.render('index', {
                    layout: false,
                    callback: {type: 'error', messages: ['Aucun utilisateur trouvé dans notre base de donnée']}
                })
            }
            else{
                //CREATE A SESSION FOR CONNECTED USER!
                req.session.user = user;
                //REDIRECT
                res.redirect('/');
            }
        }
    );
});

//? MES COURS (ROUTE)
app.get('/mes/cours', isUserConnected, async (req, res) =>{
    return sql.getCoursesByUserId({userId: req.session.user['id_utilisateur']},
        async function(courses){
            return res.render('mescours', {
                layout: false,
                user: await req.session.user,
                courses: courses
            });
        }
    );
});

//? SUPPRIMER COURS
app.get('/supprimer/cours/:id', isUserConnected, (req, res) => {
    //DELETE INSCRIT COURS (IF ADMIN)
    if(req.session.user['id_type_utilisateur'] == 2)
    return sql.deleteCourseByAdmin({
            courseId: req.params.id,
        },
        async function(status){

            return sql.getCourses({limit: ''}, async function(cours) {
                return res.render('cours', {
                    user: await req.session.user,
                    courses: cours,
                    layout: false,
                    callback: status ? {type: 'success', messages: ['Supprimé avec succès']} 
                    :  {type: 'error', messages: ['Impossible de supprimer ce cours']}
                });
            })
        }
    );

    if(req.session.user['id_type_utilisateur'] == 1)
    return sql.deleteCourseByConnectedUser({
            userId:  req.session.user['id_utilisateur'], 
            courseId: req.params.id
        },
        async function(status) {
            //GET USER COURSES (BELLOW WILL CHECK STATUS OF DELETEING)
            return sql.getCoursesByUserId({userId: req.session.user['id_utilisateur']},
                async function(courses){
                    return res.render('mescours', {
                        layout: false,
                        user: await req.session.user,
                        courses: courses,
                        callback: status ? {type: 'success', messages: ['Supprimé avec succès']} 
                                        :  {type: 'error', messages: ['Impossible de supprimer ce cours']}
                    });
                }
            );
        }
    );
});

//? REGISTRE `COURS`
app.get('/registre/cours/:id', isUserConnected, (req, res) => {
    //REGISTRE COURS BY ID
    return sql.registerCourseByConnectedUser({
            userId:  req.session.user['id_utilisateur'], 
            courseId: req.params.id
        },
        async function(status){
            return sql.getCourses({limit: ''}, async function(courses) {
                return res.render('index', {
                    user: await req.session.user,
                    courses: courses,
                    layout: false,
                    callback: status ? {type: 'success', messages: ['Vous êtes maintenant inscrit à ce cours']} 
                    :  {type: 'error', messages: ['Vous êtes déjà inscrit à ce cours']}
                });
            });
        }
    );
});

//? AJOUTER UN COURS
app.post('/ajouter/cours', isUserConnected, (req, res) => {
    return sql.addNewCourse({
            nom: req.body.nom, 
            description: req.body.description,
            capacite: req.body.capacite,
            dateDebut: Date.parse(req.body.dateDebut), // To ``Epoch`` FORMAT
            nbCours: req.body.nbCours,
        },
        async function(status){
            return sql.getCourses({limit: ''}, async function(courses) {
                return res.render('index', {
                    user: await req.session.user,
                    courses: courses,
                    layout: false,
                    callback: status ? {type: 'success', messages: ['Le cours a été ajouté avec succès']} 
                                     : {type: 'error', messages: ['Impossible d`ajouter ce cours']}
                });
            });
        }
    );
});

//? UTILISATEUR (ROUTES)
app.get('/utilisateurs', isUserConnected, async (req, res) => {

    return sql.getUsers(async function(users){
        return res.render('utilisateurs', {
            user: await req.session.user,
            users: users,
            layout: false
        });
    });

})

//? DECONNEXION
app.get('/deconnexion', (req, res) => {
    //DESTORY SESSION
    req.session.user = null;
    //REDIRECT TO INDEX
    res.redirect('/');
});
//*******************************************************************************

app.listen(port, ()=>{
    console.log(`Server lancé sur le port ${port}`);
});
