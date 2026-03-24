<script setup lang="ts">
import type { ChatMessage } from "../types";

defineProps<{
  username: string;
  input: string;
  messages: ChatMessage[];
  error: string;
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
    <input :value="username" maxlength="20" placeholder="Username..." @input="emit('update:username', ($event.target as HTMLInputElement).value)" />
    <div id="chat-box">
      <div v-for="m in messages" :key="m.id" class="chat-row"><b>{{ m.username }}:</b> {{ m.text }}</div>
    </div>
    <div class="chat-actions">
      <input :value="input" maxlength="250" placeholder="Type message..." @input="emit('update:input', ($event.target as HTMLInputElement).value)" @keydown="onEnter" />
      <button @click="emit('send')">Send</button>
    </div>
    <div v-if="error" class="chat-error">{{ error }}</div>
  </div>
</template>
