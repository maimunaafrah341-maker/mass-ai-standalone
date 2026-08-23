// Standalone auth for deployments outside Manus (Vercel/Netlify/etc).
//
// Manus's own environment authenticates requests via sdk.authenticateRequest,
// which relies on Manus's OAuth portal and only works inside that managed
// environment. This module is a drop-in replacement with the same signature
// (Request -> Promise<User | null>), verifying a Firebase ID token sent as
// `Authorization: Bearer <token>` instead. See client/src/lib/firebase.ts and
// client/src/main.tsx for the client side of this.
import type { Request } from "express";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

function getFirebaseAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  if (!ENV.firebaseProjectId || !ENV.firebaseClientEmail || !ENV.firebasePrivateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  return initializeApp({
    credential: cert({
      projectId: ENV.firebaseProjectId,
      clientEmail: ENV.firebaseClientEmail,
      privateKey: ENV.firebasePrivateKey,
    }),
  });
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function authenticateRequest(req: Request): Promise<User | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  const app = getFirebaseAdminApp();
  const decoded = await getAuth(app).verifyIdToken(token);

  // Reuse the existing `openId` column as the stable per-user identifier —
  // it's just a string key, so no schema/migration change is needed to swap
  // identity providers. Firebase UIDs go here instead of Manus openIds.
  await db.upsertUser({
    openId: decoded.uid,
    name: decoded.name ?? null,
    email: decoded.email ?? null,
    loginMethod: decoded.firebase?.sign_in_provider ?? "firebase",
    lastSignedIn: new Date(),
  });

  const user = await db.getUserByOpenId(decoded.uid);
  return user ?? null;
}
