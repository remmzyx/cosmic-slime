import { Capacitor } from "@capacitor/core";
import { computed, onMounted, onUnmounted, ref } from "vue";
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../firebase";
import type { AuthUser } from "../types";

function mapFirebaseUser(firebaseUser: User | null): AuthUser | null {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}

export function useAuth() {
  const user = ref<AuthUser | null>(null);
  const isLoading = ref(true);
  const error = ref("");

  let unsubscribe: (() => void) | null = null;

  const isAuthenticated = computed(() => !!user.value);
  const displayName = computed(() => user.value?.displayName || user.value?.email || "Anonymous");

  onMounted(() => {
    void (async () => {
      try {
        await getRedirectResult(auth);
      } catch {
        // Stale or invalid redirect state — safe to ignore
      }
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        user.value = mapFirebaseUser(firebaseUser);
        isLoading.value = false;
      });
    })();
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  async function signInWithGoogle() {
    error.value = "";
    try {
      const provider = new GoogleAuthProvider();
      // WebView blocks or mishandles popups; full-page redirect works on Capacitor.
      if (Capacitor.isNativePlatform()) {
        await signInWithRedirect(auth, provider);
      } else {
        await signInWithPopup(auth, provider);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Google sign-in failed";
    }
  }

  async function signUpWithEmail(email: string, password: string, name: string) {
    error.value = "";
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      if (name) {
        await updateProfile(credential.user, { displayName: name });
        user.value = mapFirebaseUser(credential.user);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign-up failed";
    }
  }

  async function signInWithEmail(email: string, password: string) {
    error.value = "";
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign-in failed";
    }
  }

  async function logOut() {
    error.value = "";
    try {
      await signOut(auth);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Sign-out failed";
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    displayName,
    error,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    logOut,
  };
}
