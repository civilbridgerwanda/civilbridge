import { Router } from "express";
import { startOauth, oauthCallback } from "../controllers/oauth.controller.js";

const router = Router();

const providers = [
  { name: "google", scope: ["profile", "email"] },
  { name: "facebook", scope: ["email"] },
  { name: "x", scope: null }, // scope is set on the strategy itself for X
];

for (const { name, scope } of providers) {
  router.get(`/${name}`, startOauth(name, scope));
  router.get(`/${name}/callback`, oauthCallback(name));
}

export default router;
