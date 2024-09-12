const router = require('express').Router()
const createContacts = require("../controller/createContacts");

router.post('/creates', createContacts.createContacts)

router.delete('/creates/:id', createContacts.deleteContacts)

router.get('/creates', createContacts.getContacts)

router.put('/creates/:id', createContacts.updateContacts)

module.exports = router
