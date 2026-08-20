<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { debounce } from "lodash";
import { MessageSquare, Send, Trash2, AtSign, Smile, CornerUpLeft, X } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useTaskCommentStore } from "@/stores/taskComment";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { getTimeAgo } from "@/utils/dateUtils";
import { storeToRefs } from "pinia";
import Avatar from "@/components/common/Avatar.vue";

const props = defineProps({
  taskId: {
    type: [String, Number],
    required: true,
  },
  projectId: {
    type: [String, Number],
    required: true,
  },
  canComment: {
    type: Boolean,
    default: true,
  },
});

const commentStore = useTaskCommentStore();
const { comments, loading, submitting } = storeToRefs(commentStore);

const authStore = useAuthStore();
const { user } = storeToRefs(authStore);

const alertModal = useAlertModalStore();

const EMOJIS = [
  "😀", "😂", "😊", "😍", "🤔", "😅", "😉", "😎",
  "🙌", "👍", "👎", "🙏", "💪", "👀", "🔥", "✅",
  "❌", "⚠️", "🎉", "🚀", "💡", "📌", "📎", "⏰",
  "❤️", "👏", "🤝", "😢", "😱", "🥳", "👌", "🙋",
];

const newComment = ref("");
const textareaRef = ref(null);
const mentionedIds = ref([]);
const replyingTo = ref(null);
const showEmojiPicker = ref(false);
const emojiButtonRef = ref(null);
const emojiPickerStyle = ref({});

const mentionQuery = ref("");
const mentionStartIndex = ref(null);
const mentionResults = ref([]);
const showMentionDropdown = ref(false);
const mentionDropdownStyle = ref({});

const loadComments = () => {
  if (props.taskId) commentStore.fetchComments(props.taskId);
};

// The dropdown is teleported to <body> so it always renders on top of the
// modal (and isn't clipped by the modal's scrollable body), positioned
// above the textarea and nudged sideways from it.
const updateMentionDropdownPosition = () => {
  const el = textareaRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  mentionDropdownStyle.value = {
    position: "fixed",
    top: `${rect.top - 8}px`,
    left: `${rect.left + 28}px`,
    transform: "translateY(-100%)",
    zIndex: 9999,
  };
};

// Same treatment as the mention dropdown: teleported to <body>, anchored to
// the emoji button's own position so it stays put above the comment box
// regardless of the modal's scroll/overflow.
const updateEmojiPickerPosition = () => {
  const el = emojiButtonRef.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  emojiPickerStyle.value = {
    position: "fixed",
    top: `${rect.top - 8}px`,
    right: `${window.innerWidth - rect.right}px`,
    transform: "translateY(-100%)",
    zIndex: 9999,
  };
};

const toggleEmojiPicker = () => {
  showEmojiPicker.value = !showEmojiPicker.value;
  if (showEmojiPicker.value) {
    showMentionDropdown.value = false;
    updateEmojiPickerPosition();
  }
};

const closePickersOnOutsideClick = (event) => {
  if (showEmojiPicker.value && !event.target.closest(".task-comment-emoji-picker") && !event.target.closest(".task-comment-emoji-toggle")) {
    showEmojiPicker.value = false;
  }
};

onMounted(() => {
  loadComments();
  window.addEventListener("scroll", updateMentionDropdownPosition, true);
  window.addEventListener("resize", updateMentionDropdownPosition);
  window.addEventListener("scroll", updateEmojiPickerPosition, true);
  window.addEventListener("resize", updateEmojiPickerPosition);
  document.addEventListener("click", closePickersOnOutsideClick);
});
onUnmounted(() => {
  window.removeEventListener("scroll", updateMentionDropdownPosition, true);
  window.removeEventListener("resize", updateMentionDropdownPosition);
  window.removeEventListener("scroll", updateEmojiPickerPosition, true);
  window.removeEventListener("resize", updateEmojiPickerPosition);
  document.removeEventListener("click", closePickersOnOutsideClick);
});
watch(() => props.taskId, loadComments);

const searchMentions = debounce(async () => {
  try {
    // Scoped to this project's team assignments only - matches who is
    // actually allowed to comment/be mentioned on this project's tasks.
    const { data } = await axiosInstance.get("employees", {
      params: { search: mentionQuery.value, project_id: props.projectId, limit: 5 },
    });
    // The backend rejects mentioning yourself, so don't suggest yourself
    // in the dropdown in the first place.
    const selfId = user.value?.employee_profile?.id;
    mentionResults.value = data.data.filter((employee) => employee.id !== selfId);
  } catch {
    mentionResults.value = [];
  }
}, 250);

const handleInput = (event) => {
  newComment.value = event.target.value;
  const caret = event.target.selectionStart ?? newComment.value.length;
  const textBeforeCaret = newComment.value.slice(0, caret);
  const match = textBeforeCaret.match(/(?:^|\s)@([\w.]*)$/);

  if (match) {
    mentionQuery.value = match[1];
    mentionStartIndex.value = caret - match[1].length - 1;
    showMentionDropdown.value = true;
    updateMentionDropdownPosition();
    searchMentions();
  } else {
    showMentionDropdown.value = false;
  }
};

const selectMention = (employee) => {
  const name = employee.user?.name || "Unknown";
  const before = newComment.value.slice(0, mentionStartIndex.value);
  const after = newComment.value.slice(mentionStartIndex.value + 1 + mentionQuery.value.length);
  newComment.value = `${before}@${name} ${after}`;

  if (!mentionedIds.value.includes(employee.id)) {
    mentionedIds.value.push(employee.id);
  }

  showMentionDropdown.value = false;
  nextTick(() => textareaRef.value?.focus());
};

const insertEmoji = (emoji) => {
  const el = textareaRef.value;
  const caret = el?.selectionStart ?? newComment.value.length;
  const before = newComment.value.slice(0, caret);
  const after = newComment.value.slice(caret);
  newComment.value = `${before}${emoji}${after}`;
  showEmojiPicker.value = false;
  nextTick(() => {
    textareaRef.value?.focus();
    const newCaret = caret + emoji.length;
    textareaRef.value?.setSelectionRange(newCaret, newCaret);
  });
};

const startReply = (comment) => {
  replyingTo.value = { id: comment.id, userName: comment.user?.name };
  nextTick(() => textareaRef.value?.focus());
};

const cancelReply = () => {
  replyingTo.value = null;
};

const resetComposer = () => {
  newComment.value = "";
  mentionedIds.value = [];
  showMentionDropdown.value = false;
  showEmojiPicker.value = false;
  replyingTo.value = null;
};

const submitComment = async () => {
  const body = newComment.value.trim();
  if (!body) return;

  try {
    await commentStore.createComment(props.taskId, {
      body,
      parent_id: replyingTo.value?.id ?? null,
      mentioned_employee_ids: mentionedIds.value,
    });
    resetComposer();
  } catch (error) {
    console.error("Failed to post comment:", error);
  }
};

const handleDelete = async (comment) => {
  if (await alertModal.confirm("Delete this comment?")) {
    try {
      await commentStore.deleteComment(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  }
};

// A fixed palette of vivid, readable text/background pairs (never plain
// black or white) -- picked per mentioned name via a stable hash, so the
// same person always gets the same color across every comment instead of
// re-randomizing on every render.
const MENTION_COLORS = [
  "text-red-600 bg-red-50",
  "text-orange-600 bg-orange-50",
  "text-amber-600 bg-amber-50",
  "text-lime-600 bg-lime-50",
  "text-green-600 bg-green-50",
  "text-emerald-600 bg-emerald-50",
  "text-teal-600 bg-teal-50",
  "text-cyan-600 bg-cyan-50",
  "text-sky-600 bg-sky-50",
  "text-blue-600 bg-blue-50",
  "text-indigo-600 bg-indigo-50",
  "text-violet-600 bg-violet-50",
  "text-purple-600 bg-purple-50",
  "text-fuchsia-600 bg-fuchsia-50",
  "text-pink-600 bg-pink-50",
  "text-rose-600 bg-rose-50",
];

const mentionColorClass = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return MENTION_COLORS[hash % MENTION_COLORS.length];
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Splits a comment body into text/mention/url/email segments so mentions,
// links, and emails can be rendered as real elements without ever using
// v-html (avoids XSS entirely).
const renderSegments = (comment) => {
  const body = comment.body;
  const names = (comment.mentioned_employees || [])
    .map((employee) => employee.user?.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  const groups = [];
  if (names.length) groups.push(`(?<mention>@(?:${names.join("|")}))`);
  groups.push(`(?<url>https?:\\/\\/[^\\s]+)`);
  groups.push(`(?<email>[\\w.+-]+@[\\w-]+\\.[\\w.-]+)`);

  const pattern = new RegExp(groups.join("|"), "g");
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", text: body.slice(lastIndex, match.index) });
    }
    if (match.groups.mention) {
      segments.push({ type: "mention", text: match.groups.mention });
    } else if (match.groups.url) {
      segments.push({ type: "url", text: match.groups.url });
    } else if (match.groups.email) {
      segments.push({ type: "email", text: match.groups.email });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ type: "text", text: body.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: "text", text: body }];
};

const sortedComments = computed(() =>
  [...comments.value].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
);

// Group into top-level threads with their replies (any depth) flattened
// chronologically underneath, so replying to an earlier reply still surfaces
// in the same thread instead of forming deep nested indentation.
const threads = computed(() => {
  const all = sortedComments.value;
  const byId = new Map(all.map((c) => [c.id, c]));

  const rootIdOf = (comment) => {
    let current = comment;
    const seen = new Set();
    while (current.parent_id && byId.has(current.parent_id) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parent_id);
    }
    return current.id;
  };

  const roots = all.filter((c) => !c.parent_id);
  return roots.map((root) => ({
    root,
    replies: all.filter((c) => c.parent_id && rootIdOf(c) === root.id),
  }));
});
</script>

<template>
  <div>
    <div class="flex items-center gap-2 mb-3">
      <MessageSquare class="w-3.5 h-3.5 text-brand-light" />
      <h3 class="text-brand-dark text-xs font-semibold">
        Comments
        <span v-if="comments.length" class="text-brand-light font-normal">({{ comments.length }})</span>
      </h3>
    </div>

    <!-- Comment List -->
    <div v-if="loading" class="space-y-3.5 mb-5">
      <div v-for="i in 2" :key="i" class="flex gap-3.5 animate-pulse">
        <div class="w-8 h-8 rounded-full bg-gray-200 shrink-0"></div>
        <div class="flex-1 space-y-2.5">
          <div class="h-3 w-1/3 bg-gray-200 rounded"></div>
          <div class="h-10 bg-gray-100 rounded-[10px]"></div>
        </div>
      </div>
    </div>

    <div v-else-if="threads.length === 0" class="text-center py-8 mb-5 bg-gray-50 rounded-[12px]">
      <MessageSquare class="w-6 h-6 text-gray-300 mx-auto mb-2" />
      <p class="text-brand-light text-sm">No comments yet. Start the conversation.</p>
    </div>

    <div v-else class="space-y-6 mb-5 max-h-80 overflow-y-auto pr-1.5">
      <div v-for="thread in threads" :key="thread.root.id" class="space-y-3.5">
        <!-- Root comment -->
        <div class="flex gap-3.5 group">
          <Avatar :src="thread.root.user?.profile_photo" :alt="thread.root.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
          <div class="flex-1 min-w-0">
            <div class="bg-gray-50 rounded-[12px] px-4 py-3">
              <div class="flex items-center justify-between gap-2.5">
                <p class="text-brand-dark text-sm font-semibold" :title="thread.root.user?.name">{{ thread.root.user?.name }}</p>
                <button
                  v-if="thread.root.can_delete"
                  type="button"
                  @click="handleDelete(thread.root)"
                  class="text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  title="Delete comment"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
              <p class="text-sm text-brand-dark leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                <template v-for="(segment, idx) in renderSegments(thread.root)" :key="idx">
                  <span v-if="segment.type === 'mention'" :class="mentionColorClass(segment.text)" class="font-semibold rounded px-1.5">{{ segment.text }}</span>
                  <a
                    v-else-if="segment.type === 'url'"
                    :href="segment.text"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-[#0C51D9] underline hover:no-underline break-all"
                    >{{ segment.text }}</a
                  >
                  <a v-else-if="segment.type === 'email'" :href="`mailto:${segment.text}`" class="text-[#0C51D9] underline hover:no-underline">{{ segment.text }}</a>
                  <template v-else>{{ segment.text }}</template>
                </template>
              </p>
            </div>
            <div class="flex items-center gap-3.5 mt-1.5 ml-0.5">
              <p class="text-gray-400 text-xs">{{ getTimeAgo(thread.root.created_at) }}</p>
              <button
                v-if="canComment"
                type="button"
                @click="startReply(thread.root)"
                class="text-gray-400 hover:text-[#0C51D9] transition-colors text-xs font-semibold flex items-center gap-1.5"
              >
                <CornerUpLeft class="w-3 h-3" />
                Reply
              </button>
            </div>
          </div>
        </div>

        <!-- Replies -->
        <div v-if="thread.replies.length" class="pl-6 sm:pl-8 md:pl-11 space-y-3.5 border-l-2 border-gray-100 ml-5">
          <div v-for="reply in thread.replies" :key="reply.id" class="flex gap-3.5 group">
            <Avatar :src="reply.user?.profile_photo" :alt="reply.user?.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
            <div class="flex-1 min-w-0">
              <div class="bg-gray-50 rounded-[12px] px-4 py-3">
                <div class="flex items-center justify-between gap-2.5">
                  <p class="text-brand-dark text-sm font-semibold" :title="reply.user?.name">{{ reply.user?.name }}</p>
                  <button
                    v-if="reply.can_delete"
                    type="button"
                    @click="handleDelete(reply)"
                    class="text-gray-300 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete comment"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <p
                  v-if="reply.reply_to && reply.reply_to.id !== thread.root.id"
                  class="text-xs text-brand-light border-l-2 border-[#0C51D9]/30 pl-2.5 mt-1.5 mb-1.5 italic truncate"
                >
                  Replying to <span class="font-semibold">{{ reply.reply_to.user_name }}</span>: {{ reply.reply_to.snippet }}
                </p>
                <p class="text-sm text-brand-dark leading-relaxed whitespace-pre-wrap break-words mt-0.5">
                  <template v-for="(segment, idx) in renderSegments(reply)" :key="idx">
                    <span v-if="segment.type === 'mention'" :class="mentionColorClass(segment.text)" class="font-semibold rounded px-1.5">{{ segment.text }}</span>
                    <a
                      v-else-if="segment.type === 'url'"
                      :href="segment.text"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-[#0C51D9] underline hover:no-underline break-all"
                      >{{ segment.text }}</a
                    >
                    <a v-else-if="segment.type === 'email'" :href="`mailto:${segment.text}`" class="text-[#0C51D9] underline hover:no-underline">{{ segment.text }}</a>
                    <template v-else>{{ segment.text }}</template>
                  </template>
                </p>
              </div>
              <div class="flex items-center gap-3.5 mt-1.5 ml-0.5">
                <p class="text-gray-400 text-xs">{{ getTimeAgo(reply.created_at) }}</p>
                <button
                  v-if="canComment"
                  type="button"
                  @click="startReply(reply)"
                  class="text-gray-400 hover:text-[#0C51D9] transition-colors text-xs font-semibold flex items-center gap-1.5"
                >
                  <CornerUpLeft class="w-3 h-3" />
                  Reply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not eligible to comment -->
    <div
      v-if="!canComment"
      class="flex items-center gap-3 bg-gray-50 border border-[#DCDEDD] rounded-[12px] px-4 py-3.5"
    >
      <MessageSquare class="w-4 h-4 text-gray-400 shrink-0" />
      <p class="text-brand-light text-xs">
        Only employees assigned to this project's teams can comment or mention others here.
      </p>
    </div>

    <!-- Composer -->
    <div v-else class="flex gap-3.5">
      <Avatar :src="user?.profile_photo" :alt="user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
      <div class="flex-1 relative">
        <!-- Replying-to banner -->
        <div
          v-if="replyingTo"
          class="flex items-center justify-between gap-2.5 bg-blue-50 border border-blue-100 rounded-[10px] px-3.5 py-2 mb-2.5"
        >
          <p class="text-xs text-[#0C51D9]">
            Replying to <span class="font-semibold">{{ replyingTo.userName }}</span>
          </p>
          <button type="button" @click="cancelReply" class="text-blue-400 hover:text-blue-700 transition-colors">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          ref="textareaRef"
          :value="newComment"
          @input="handleInput"
          @keydown.enter.exact.prevent="submitComment"
          rows="2"
          placeholder="Write a comment... use @ to mention someone"
          class="w-full bg-gray-50 rounded-[12px] pl-4 pr-4 pt-3 pb-11 text-sm text-brand-dark border border-[#DCDEDD] hover:border-[#0C51D9] focus:border-[#0C51D9] focus:bg-white transition-all duration-300 resize-none outline-none"
        ></textarea>

        <!-- Emoji + Send -->
        <div class="absolute bottom-2.5 right-2.5 flex items-center gap-2">
          <button
            ref="emojiButtonRef"
            type="button"
            @click="toggleEmojiPicker"
            class="task-comment-emoji-toggle w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            :class="showEmojiPicker ? 'text-[#0C51D9] bg-blue-50' : 'text-gray-400 hover:text-[#0C51D9] hover:bg-gray-100'"
            title="Insert emoji"
          >
            <Smile class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="submitComment"
            :disabled="submitting || !newComment.trim()"
            class="w-8 h-8 rounded-full flex items-center justify-center bg-[#0C51D9] hover:brightness-110 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="replyingTo ? 'Reply' : 'Comment'"
          >
            <Send class="w-4 h-4 text-white" />
          </button>
        </div>

        <!-- Mention Dropdown (teleported so it always sits above the modal, unclipped) -->
        <Teleport to="body">
          <div
            v-if="showMentionDropdown && mentionResults.length > 0"
            :style="mentionDropdownStyle"
            class="bg-white border border-[#DCDEDD] rounded-[12px] shadow-2xl overflow-hidden max-h-56 overflow-y-auto w-72"
          >
            <button
              v-for="employee in mentionResults"
              :key="employee.id"
              type="button"
              @mousedown.prevent="selectMention(employee)"
              class="w-full p-3 hover:bg-gray-50 transition-colors flex items-center gap-3 text-left"
            >
              <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
              <div class="flex-1 min-w-0">
                <p class="text-brand-dark text-sm font-medium truncate">{{ employee.user?.name }}</p>
                <p class="text-brand-light text-xs truncate">{{ employee.job_information?.job_title }}</p>
              </div>
              <AtSign class="w-3.5 h-3.5 text-gray-300 shrink-0" />
            </button>
          </div>
        </Teleport>

        <!-- Emoji Picker (teleported so it always sits above the modal, unclipped) -->
        <Teleport to="body">
          <div
            v-if="showEmojiPicker"
            :style="emojiPickerStyle"
            class="task-comment-emoji-picker bg-white border border-[#DCDEDD] rounded-[12px] shadow-2xl p-2.5 grid grid-cols-8 gap-1.5 w-64"
          >
            <button
              v-for="emoji in EMOJIS"
              :key="emoji"
              type="button"
              @mousedown.prevent="insertEmoji(emoji)"
              class="w-7 h-7 flex items-center justify-center text-lg rounded hover:bg-gray-100 transition-colors"
            >
              {{ emoji }}
            </button>
          </div>
        </Teleport>

      </div>
    </div>
  </div>
</template>
