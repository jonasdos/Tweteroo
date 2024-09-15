import express from "express"
import cors from "cors"
import { MongoClient, ObjectId } from "mongodb"
import dotenv from "dotenv"
import joi from "joi"

const configUser = joi.object({
  username: joi.string().required(),
  avatar: joi.string().required()
})
const configTweet = joi.object({
  username: joi.string().required(),
  tweet: joi.string().required()
})

const configDeleteTweet = joi.object({
  _id: joi.string().required(),
  username: joi.string().required(),
})

dotenv.config()
const port = process.env.PORT || 5500
const mongoClient = new MongoClient(process.env.DATABASE_URL)

try {
  await mongoClient.connect()
  console.log("Conexão com banco de dados.")

}
catch {
  console.log('Ocorreu um erro ao conectar o banco de dados')
}
const db = mongoClient.db()
const app = express()
app.use(cors())
app.use(express.json())

// rotas 
app.get("/tweets", async (req, res) => {

  try {
    const data = await db.collection('tweets').find().toArray()
    res.send(data)
  }
  catch (error) {
    res.status(500).send('Ocorreu um erro ao carregar os tweets')
  }
})


app.post("/sign-up", async (req, res) => {
  const user = req.body
  const validaUser = configUser.validate(user, { abortEarly: false })
  if (validaUser.error) {
    const erros = validaUser.error.details.map((detail) => detail.message)
    return res.status(422).send(erros)
  }

  try {
    const verificaUserName = await db.collection('users').findOne({ username: user.username })
    if (verificaUserName) {
      return res.status(409).send('Este nome de usuário já está em uso.')
    }

    await db.collection('users').insertOne(user)
    res.status(201).send(`${user.username} acaba de logar`)
  }
  catch (err) { res.status(500).send('Ocorreu um erro ao cadastrar usuário') }

})
app.post('/tweets', async (req, res) => {
  const tweet = req.body
  const validaTweet = configTweet.validate(tweet, { abortEarly: false })
  if (validaTweet.error) {
    const erros = validaTweet.error.details.map((detail) => detail.message)
    return res.status(422).send(erros)
  }
  try {
    const verificaUserName = await db.collection('users').findOne({ username: tweet.username })
    if (verificaUserName) {
      await db.collection('tweets').insertOne({ username: tweet.username, avatar: verificaUserName.avatar, tweet: tweet.tweet })
      return res.status(201).send('Tweet postado com sucesso')
    } else {
      return res.status(401).send('O usuário não existe na base de dados...')
    }

  }
  catch (err) {
    res.status(401).send(err)
  }
}
)
const configEditTweet = joi.object({

  username: joi.string().required(),
  tweet: joi.string().required()
})
app.put('/tweets/:id', async (req, res) => {
  const id = req.params.id
  const ajuste = req.body
  const validaTweet = configEditTweet.validate(ajuste, { abortEarly: false })
  if (validaTweet.error) {
    const erros = validaTweet.error.details.map((detail) => detail.message)
    return res.status(422).send(erros)
  }
  let encontraId = await db.collection('tweets').findOne({ _id: new ObjectId(id) })
  if (encontraId) {
    try {
      db.collection('tweets').updateOne({
        _id: new ObjectId(id)
      }, {
        $set: {
          tweet: ajuste.tweet
        }
      })
      res.status(204)
    }
    catch {
      return res.status(400).send('Erro ao editar o tweet')
    }
  }
  else {
    return res.status(404).send('O tweet a ser editado não existe!')
  }

})
app.delete('/tweets/:id', async (req, res) => {
  const id = req.params.id
  const body = req.body
  const validaDelete = configDeleteTweet.validate(body, { abortEarly: false })
  if (validaDelete.error) {
    const erros = validaDelete.error.details.map((detail) => detail.message)
    return res.status(422).send(erros)
  }
  const item = await db.collection('tweets').findOne({ _id: new ObjectId(id) })

  if (item) {
    try {
      await db.collection('tweets').deleteOne({ _id: new ObjectId(id) })
      res.status(204).send('Sucesso ao excluir o tweet')
    }
    catch {
      res.status(400).send('Erro ao excluir o Tweet')
    }
  } else {
    res.status(404).send('Tweet não existe.')
  }
}
)


app.listen(port, () => { console.log("Servidor rodando na porta: ", port) })