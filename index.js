const express = require('express')
const app = express()
const db = require('./connection/db')
const upload = require('./middlewares/uploadFile.js')

const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')



app.set('view engine', 'hbs')
app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))
app.use('/', express.static(__dirname + '/public'))
app.use(express.urlencoded({
    extended: false
}))
app.use(flash())
app.use(
    session({
        cookie: {
            maxAge: 2 * 60 * 60 * 1000,
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: "secretValue"
    })
)



app.get('/', (req, res) => {

    let query = `SELECT * FROM tb_experience`

    db.connect((err, client) => {
        if (err) throw err
        client.query(query, (err, result) => {
            if (err) throw err
            let data = result.rows
            res.render('index', {
                data: data,
                isLogin: req.session.isLogin,
                user: req.session.user
            })
        })
    })
})
app.get('/contactForm', (req, res) => res.render('contactForm', {
    isLogin: req.session.isLogin,
    user: req.session.user
}))
app.get('/add-blog', (req, res) => res.render('add-blog', {
    isLogin: req.session.isLogin,
    user: req.session.user
}))
app.get('/blog-detail/:id', (req, res) => {

    let id = req.params.id
    let query = `SELECT * FROM tb_blog WHERE id=${id}`

    db.connect(function (err, client) {
        if (err) throw err
        client.query(query, function (err, result) {
            if (err) throw err
            let data = result.rows[0]

            res.render('blog-detail', {
                data: data,
                isLogin: req.session.isLogin,
                user: req.session.user
            })
        })
    })
})

app.get('/blog-list', (req, res) => {

    let query = `SELECT tb_blog.id, tb_blog.title, tb_blog.content, tb_blog.image, tb_user.name AS author, tb_blog.postdate  
                FROM tb_user LEFT JOIN tb_blog 
                ON tb_user.id = tb_blog.author`

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            let data = result.rows

            let dataBlogs = data.map(function (data) {
                return {
                    ...data,
                    isLogin: req.session.isLogin,
                    postDistance: getDistenceTime(data.postdate)
                }
            })

            res.render('blog-list', {
                isLogin: req.session.isLogin,
                blogs: dataBlogs,
                user: req.session.user
            })
        })

    })
})

app.post('/blog-list', upload.single('image'), (req, res) => {

    let data = req.body

    if (!req.session.user) {
        req.flash('danger', 'Please Login')
        return res.redirect('/add-blog')
    }

    let authorId = req.session.user.id

    let image = req.file.filename
    console.log(image)
    // data = {
    //     title: data.title,
    //     content: data.content,
    //     image: 'image'
    // }

    let query = `INSERT INTO tb_blog(title,content,image,author) VALUES('${data.title}','${data.content}','${image}','${authorId}')`

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(query, function (err, result) {
            done()

            if (err) throw err
            console.log('sukses input')


            res.redirect('/blog-list')

        })
    })
})

app.get('/delete-blog/:id', (req, res) => {
    let id = req.params.id

    console.log(id)
    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(`DELETE FROM tb_blog WHERE id=${id}`, function (err, result) {
            done()

            if (err) throw err

            console.log('sukses hapus')

            res.redirect('/blog-list')
        })
    })
})

app.get('/edit-blog/:id', (req, res) => {

    let id = req.params.id
    let query = `SELECT * FROM tb_blog WHERE id=${id}`
    db.connect((err, client) => {
        if (err) throw err
        client.query(query, (err, result) => {
            if (err) throw err

            let data = result.rows[0]
            console.log(data)


            // res.render('edit-blog')
        })
    })
})


app.post('/update-blog/:id', (req, res) => {
    let id = req.params.id
    let dataUpdate = req.body

    dataUpdate = {
        id: id,
        title: dataUpdate.title,
        content: dataUpdate.content,
        image: 'fotobaru.png'
    }

    console.log(id)
    console.log(dataUpdate)

    db.connect(function (err, client, done) {
        if (err) throw err
        client.query(`UPDATE tb_blog SET title='${dataUpdate.title}',content='${dataUpdate.content}',image='${dataUpdate.image}' WHERE id=${id}`, (err, result) => {
            if (err) throw err

            console.log('update sukses')

            res.redirect('/blog-list')
        })
    })
})

app.get('/register', (req, res) => res.render('register'))

app.post('/register', (req, res) => {

    const data = req.body
    const hashedPassword = bcrypt.hashSync(data.password, 10)

    let query = `INSERT INTO tb_user(name,email,password) VALUES ('${data.name}','${data.email}','${hashedPassword}')`

    db.connect((err, client) => {
        if (err) throw err
        client.query(query, (err, result) => {
            if (err) throw err
            res.render('login')
        })
    })

})

app.get('/login', (req, res) => res.render('login'))

app.post('/login', (req, res) => {
    const {
        email,
        password
    } = req.body

    let query = `SELECT * FROM tb_user WHERE email = '${email}'`

    db.connect((err, client) => {
        if (err) throw err

        client.query(query, (err, result) => {
            if (err) throw err

            if (result.rows.length == 0) {
                req.flash('danger', 'your input email not found')
                return res.redirect('/login')
            }

            let isMatch = bcrypt.compareSync(password, result.rows[0].password)

            if (isMatch) {
                req.session.isLogin = true

                req.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                }


                req.flash('success', 'Login is success')
                res.redirect('/blog-list')
            } else {
                req.flash("danger','email and password don't match")
                res.redirect('/login')
            }
        })
    })
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/blog-list')
})


const port = 3000
app.listen(port, () => console.log(`server starting on port:${port}`))



let month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'Desember'
]

function getFullTime(time) {

    let date = time.getDate()
    let mothIndex = time.getMonth()
    let year = time.getFullYear()


    let hours = time.getHours()
    let minutes = time.getMinutes()

    let fullTime = `${date} ${month[mothIndex]} ${year} ${hours}:${minutes}`

    return fullTime
}

function getDistenceTime(time) {

    let timePost = time
    let timeNow = new Date();

    let distance = timeNow - timePost

    // console.log(timePost)
    // console.log(timeNow)
    // console.log(distance)

    let milisecond = 1000
    let secondInHours = 3600
    let hoursInDay = 23

    let distenceDay = Math.floor(distance / (milisecond * secondInHours * hoursInDay))

    if (distenceDay >= 1) {
        return `${distenceDay} day ago`
    } else {

        let distenceHours = Math.floor(distance / (1000 * 60 * 60))
        if (distenceHours >= 1) {
            return `${distenceHours} Hours ago`
        } else {

            let distenceMinutes = Math.floor(distance / (1000 * 60))
            if (distenceMinutes >= 1) {
                return `${distenceMinutes} minutes ago`
            } else {
                let distenceSecond = Math.floor(distance / 1000)
                return `${distenceSecond} seconds ago`
            }
        }
    }
}

// setInterval(() => {

//     app.get('/blog-list')

// }, 5000)