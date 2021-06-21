var admin = require("firebase-admin")
const express = require('express');
const { database } = require("firebase-admin");
require('dotenv').config()

const RazorPay = require("./config/RazorPay")

const app = express()


app.use(express.json())
//Listen on 3000
app.listen(3000, function () {
    console.log('Listening on 3000')
})

var serviceAccount = require(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://ThePalm.firebaseio.com'
});
console.log("Firebase Initialized...!")
const db = admin.firestore();

async function getRooms(rates) {
    const snapshot = await db.collection('Rooms').get();
    snapshot.forEach((doc) => {
        console.log(doc.id, '=>', doc.data()['rates']);
        rates[doc.id] = doc.data()['rates']
    });
}

app.post('/getPaymentLink', (req, res) => {
    totalCost = 0;
    inputs = req.body
    //Check inputs
    console.log("Inputs:", inputs)

    //Fetch prices from Firebase

    //var Rates = { Deluxe: '200', Standard: '300', Tent: '500' };
    var Rates = {}
    getRooms(Rates).then(() => {
        console.log("Rates", Rates);
        //res.send(Rates)

        //Calculate Total Cost
        for (roomtype in Rates) {
            totalCost = totalCost + (Number(Rates[roomtype]) * Number(inputs[roomtype]))
        }

        //Razorpay
        totalCost = totalCost * 100 //Razorpay takes paise as input 
        console.log(totalCost)
        const params = {
            type: "link",
            amount: totalCost,
            currency: "INR",
            description: "The Palm Payment",
            customer: {
                "name": req.name,
                "contact": req.contact,
                "email": req.email
            },
            callback_method: "get",
            callback_url: "https://thepalm.netlify.app/#/",
        }
        RazorPay.invoices.create(params).then((data) => {
            //Update on Database
            res.status(200).json({
                status: "success",
                data
            })
        }).catch((error) => {
            res.status(500).json({
                status: "fail",
                error
            })
        })
    })
    //res.send(totalCost.toString());
})
