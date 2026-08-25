# Firebase Backend Decision References

Samadhan uses **Cloud Firestore** as a document-oriented Firestore data layer during the hackathon. The React app does not call Firestore directly for workflow records; instead, the existing Express/tRPC server uses the Firebase Admin SDK and the server-only service-account credential. The committed Firestore rules deny direct browser reads and writes.

| Decision | Source finding | Source |
|---|---|---|
| Use Firestore for workflow records | Cloud Firestore stores documents in collections and supports nested fields/subcollections, making it appropriate for lightweight organization, challenge, project, and membership records. | [Cloud Firestore data model](https://firebase.google.com/docs/firestore/data-model) |
| Deny direct client access without Firebase Auth | Firebase’s guidance explains that user- and role-based Firestore rules need Firebase Authentication; server client libraries instead rely on IAM and bypass Firestore rules. | [Cloud Firestore security rules](https://firebase.google.com/docs/firestore/security/get-started) |
| Avoid SQL Connect for this hackathon | Firebase SQL Connect is PostgreSQL-backed and introduces a managed GraphQL/schema workflow with user authentication integration, making it unnecessary for the constrained demo build. | [Firebase SQL Connect](https://firebase.google.com/docs/sql-connect) |

The project must remain within the requested no-cost Firebase scope: Firestore under its free allowance, Firebase Hosting only if a static surface is desired, and Analytics. It does not use Firebase Authentication, Cloud Functions, Cloud SQL, or Firebase SQL Connect.
