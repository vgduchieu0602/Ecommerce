import express, { Router } from 'express'

const router:Router = express.Router()

router.post("/user-registration", userRegistration)

export default router