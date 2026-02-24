---
description: Security checklist to review before deploying or pushing code to production
---

# Security Checklist

Run this checklist before every deploy or push to production.

## 1. No Hardcoded Credentials
Search the entire codebase for exposed secrets:

```
// turbo
grep -rn "password\|secret\|apiKey\|token\|credential" --include="*.js" --include="*.html" --include="*.json" public/
```

- ❌ **Never** hardcode passwords, API secrets, or auth tokens in client-side code.
- ❌ **Never** include login credentials (email/password) in HTML or JS files.
- ✅ Firebase `apiKey` in `firebase-config.js` is **safe** — it's a public identifier, not a secret. Security is enforced via Firestore Rules and Auth.
- ✅ Use environment variables or server-side functions for truly sensitive keys.

## 2. No Migration/Debug Pages in Production
Check for utility pages that should not be public:

```
// turbo
dir public\migrate* public\test* public\debug* public\seed* 2>$null
```

- ❌ Remove any migration, seeding, testing, or debug HTML pages before deploying.
- ❌ These pages often contain hardcoded credentials or admin operations.
- ✅ If migration tools are needed, run them locally or via a CLI script, never from a public page.

## 3. Firebase Security Rules
Verify that Firestore rules are restrictive:

- ✅ Public users should only have **read** access to the `menu` collection.
- ✅ Only authenticated admin should have **write** access.
- ❌ Never use `allow read, write: if true;` in production.

Recommended rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /menu/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 4. Sensitive Files in .gitignore
Ensure `.gitignore` excludes:

```
.env
.env.local
*.key
*.pem
node_modules/
```

## 5. Review Git History for Leaked Secrets
If credentials were previously committed (even if now deleted), they remain in git history. Consider:

- Changing the exposed password immediately.
- Using `git filter-branch` or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) to purge from history if critical.

## 6. Admin Password Strength
- ❌ Never use simple passwords like `admin123`.
- ✅ Use a strong, unique password (12+ characters, mixed case, numbers, symbols).
- ✅ Change the admin password in Firebase Console → Authentication → Users.
