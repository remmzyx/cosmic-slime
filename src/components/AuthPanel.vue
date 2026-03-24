<script setup lang="ts">
import { ref } from "vue";
import type { AuthUser } from "../types";

defineProps<{
  user: AuthUser | null;
  isLoading: boolean;
  error: string;
}>();

const emit = defineEmits<{
  signInWithGoogle: [];
  signUpWithEmail: [email: string, password: string, name: string];
  signInWithEmail: [email: string, password: string];
  logOut: [];
}>();

const isSignUp = ref(false);
const email = ref("");
const password = ref("");
const name = ref("");

function handleSubmit() {
  if (isSignUp.value) {
    emit("signUpWithEmail", email.value, password.value, name.value);
  } else {
    emit("signInWithEmail", email.value, password.value);
  }
}

function toggleMode() {
  isSignUp.value = !isSignUp.value;
  email.value = "";
  password.value = "";
  name.value = "";
}
</script>

<template>
  <div id="auth-panel">
    <div class="auth-title">Account</div>

    <template v-if="isLoading">
      <div class="auth-loading">Loading...</div>
    </template>

    <template v-else-if="user">
      <div class="auth-user-info">
        <img v-if="user.photoURL" :src="user.photoURL" class="auth-avatar" />
        <span class="auth-username">{{ user.displayName || user.email }}</span>
      </div>
      <button class="auth-btn logout" @click="emit('logOut')">Sign Out</button>
    </template>

    <template v-else>
      <button class="auth-btn google" @click="emit('signInWithGoogle')">Sign in with Google</button>

      <div class="auth-divider">or</div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <input v-if="isSignUp" v-model="name" type="text" placeholder="Display name" maxlength="20" />
        <input v-model="email" type="email" placeholder="Email" required />
        <input v-model="password" type="password" placeholder="Password" minlength="6" required />
        <button type="submit" class="auth-btn submit">{{ isSignUp ? "Sign Up" : "Sign In" }}</button>
      </form>

      <button class="auth-toggle" @click="toggleMode">
        {{ isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up" }}
      </button>
    </template>

    <div v-if="error" class="auth-error">{{ error }}</div>
  </div>
</template>
