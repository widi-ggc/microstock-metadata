// Modul Firebase (Auth + Firestore). Memerlukan server (http/https), bukan file:// (lihat README).
import { firebaseConfig } from "./firebase-config.js";

const configured = !!firebaseConfig.apiKey && !/^ISI/.test(firebaseConfig.apiKey);
if (!configured) {
  window.Cloud = { configured: false, user: null };
  window.dispatchEvent(new CustomEvent("cloud-auth"));
} else {
  const V = "10.12.2", G = "https://www.gstatic.com/firebasejs/" + V + "/";
  const { initializeApp } = await import(G + "firebase-app.js");
  const A = await import(G + "firebase-auth.js");
  const F = await import(G + "firebase-firestore.js");
  const app = initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
  const clean = (o) => JSON.parse(JSON.stringify(o));
  window.Cloud = {
    configured: true, user: null,
    signUp: (e, p) => A.createUserWithEmailAndPassword(auth, e, p),
    signIn: (e, p) => A.signInWithEmailAndPassword(auth, e, p),
    signOut: () => A.signOut(auth),
    reset: (e) => A.sendPasswordResetEmail(auth, e),
    put: (kind, item) => F.setDoc(F.doc(db, "users", auth.currentUser.uid, kind, item.id), clean(item)),
    remove: (kind, id) => F.deleteDoc(F.doc(db, "users", auth.currentUser.uid, kind, id)),
    list: async (kind) => (await F.getDocs(F.collection(db, "users", auth.currentUser.uid, kind))).docs.map((d) => d.data()),
  };
  A.onAuthStateChanged(auth, (u) => {
    window.Cloud.user = u;
    if (u) F.setDoc(F.doc(db, "users", u.uid), { email: u.email, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    window.dispatchEvent(new CustomEvent("cloud-auth"));
  });
}
