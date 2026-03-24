<script setup lang="ts">
import type { ChatMessage } from "../types";

defineProps<{
  username: string;
  input: string;
  messages: ChatMessage[];
  error: string;
  isAuthenticated: boolean;
}>();

const emit = defineEmits<{
  "update:username": [value: string];
  "update:input": [value: string];
  send: [];
}>();

function onEnter(event: KeyboardEvent) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  emit("send");
}
</script>

<template>
  <div id="chat-panel">
    <div class="chat-title">Global Chat</div>
    <div id="chat-box">
      <div v-for="m in messages" :key="m.id" class="chat-row"><b>{{ m.username }}:</b> {{ m.text }}</div>
    </div>
    <template v-if="isAuthenticated">
      <div class="chat-actions">
        <input :value="input" maxlength="250" placeholder="Type message..." @input="emit('update:input', ($event.target as HTMLInputElement).value)" @keydown="onEnter" />
        <button @click="emit('send')">Send</button>
      </div>
    </template>
    <template v-else>
      <div class="chat-auth-required">Sign in to chat</div>
    </template>
    <div v-if="error" class="chat-error">{{ error }}</div>
  </div>
</template>
