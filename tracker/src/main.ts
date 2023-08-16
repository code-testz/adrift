import dotenv from "dotenv";
import express from "express";
import expressWs from "express-ws";


import serviceAccount from "./admin-creds.json";

import admin, { ServiceAccount } from "firebase-admin";
import { WebSocket } from "ws";

import { v4 as uuid } from "uuid";

dotenv.config();

let members: Record<string, WebSocket> = {};


const app = express() as unknown as expressWs.Application;
expressWs(app);

app.use(express.json());


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
  databaseURL: "https://adrift-6c1f6-default-rtdb.firebaseio.com"
});
let db = admin.database();
let reff = db.ref("/swarm");

reff.set({
  dummy: 1,
});

let ids: string[] = ["dummy"];

reff.on("value", snapshot => {
  let val = snapshot.val();
  console.log(val);
  if (!val) return;

  if (Object.keys(val) == ids) {
    return;
  }

  let newkeys = Object.keys(val).filter(id => id != "dummy" && !ids.includes(id));

  for (let key of newkeys) {
    let offer = val[key];
    console.log("new offer:" + offer);

    if (Object.keys(members).length < 1) {
      db.ref(`/swarm/${key}`).set(JSON.stringify({ error: "no swarm members found" }));
      console.error("no swarm members!");
      return;
    }

    let selectedid = Object.keys(members)[Math.floor(Math.random() * Object.keys(members).length)];

    let selectedmember = members[selectedid];
    selectedmember.once("message", (answer) => {
      console.log("setting answer" + answer);
      db.ref(`/swarm/${key}`).set(answer);
    });
    selectedmember.send(offer);

  }

  ids = ids.concat(newkeys);
});


app.ws("/join", (ws, _req) => {

  let id = uuid();
  console.log(_req.ip);
  console.log(`ws connect of id ${id}`);

  members[id] = ws;

  ws.onclose = () => {
    delete members[id];
  };

});
setInterval(() => {
  console.log(`${Object.keys(members).length} members`);
}, 5000);

app.listen(17776, () => console.log("listening"));
