const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const knex = require('knex')

const pgDatabase = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1',
        user: 'postgres',
        password: 'vohuynh',
        database: 'face-detector'
    }

});

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());


app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    pgDatabase.select('*').from('users').where({ id })
        .then(user => {
            if (user.length) {
                res.json(user[0])
            } else {
                res.status(400).json('Not found')
            }
        })
        .catch(err => res.status(400).json('error'))
})

app.get('/rank/:id', (req, res) => {
    const { id } = req.params;
    pgDatabase.select('*').from('users').then(database => {
        const scoreArray = [];
        database.sort(function (a, b) {
            return (Number(a.id) - Number(b.id));
        });
        for (var i = 0; i < database.length; i++) {
            scoreArray.push(Number(database[i].facedetectscore));
        }
        const sorted = scoreArray.slice().sort(function (a, b) { return b - a })
        const ranks = scoreArray.map(function (v) { return sorted.indexOf(v) + 1 });
        console.log(ranks);
        const matchAccount = database.find((value, index) => {
            return (Number(value.id) === Number(id));
        })
        if (matchAccount) {
            res.json(ranks[id - 1]);
        } else {
            res.json('No such user');
        }
    });
})
app.post('/signin', (req, res) => {
    const { email, password } = req.body;
    pgDatabase.select('email', 'password').from('login')
        .where('email', '=', email)
        .then(data => {
            if (password === data[0].password) {
                return pgDatabase.select('*').from('users')
                    .where('email', '=', email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json('unable to get user'))
            } else {
                res.status(400).json('something is wrong')
            }
        })
        .catch(err => res.status(400).json('something is wrong'))
})

app.post('/register', (req, res) => {
    const { email, password } = req.body;
    pgDatabase.transaction(trx => {
        trx.insert({
            email: email,
            password: password
        })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                    .returning('*')
                    .insert({
                        email: loginEmail[0],
                        name: loginEmail[0],
                    })
                    .then(user => {
                        res.json(user[0]);
                    })
            })
            .then(trx.commit)
            .catch(trx.rollback)
    })
        .catch(err => res.status(400).json('unable to register'))
})


app.put('/image', (req, res) => {
    const { id, score } = req.body;
    pgDatabase('users').where('id', '=', id)
        .update('facedetectscore', score)
        .returning('facedetectscore')
        .then(score => {
            res.json(score[0]);
        })
        .catch(err => res.status(400).json('error'))
})
app.listen(process.env.PORT || 3000);


// post sign in
// post register