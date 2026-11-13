<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { debounce } from "lodash-es";
import { useRoute } from "vue-router";
import { MessageSquare, Send, Trash2, AtSign, Smile, CornerUpLeft, X } from "lucide-vue-next";
import { axiosInstance } from "@/plugins/axios";
import { useTaskCommentStore } from "@/stores/taskComment";
import { useAuthStore } from "@/stores/auth";
import { useAlertModalStore } from "@/stores/alertModal";
import { getTimeAgo } from "@/utils/dateUtils";
import { storeToRefs } from "pinia";
import Avatar from "@/components/common/Avatar.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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

const route = useRoute();

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
  if (await alertModal.confirm(t("projects.comments.deleteConfirm"))) {
    try {
      await commentStore.deleteComment(comment.id);
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  }
};

const MENTION_COLORS = ["text-ui-accent bg-ui-accent-soft"];

const mentionColorClass = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return MENTION_COLORS[hash % MENTION_COLORS.length];
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const highlightCommentId = computed(() => (route.query.comment ? Number(route.query.comment) : null));
const scrolledToComment = ref(false);
watch(highlightCommentId, () => {
  scrolledToComment.value = false;
});

watch(
  [threads, highlightCommentId],
  async ([val, targetId]) => {
    if (scrolledToComment.value || !targetId || !val.length) return;
    await nextTick();
    const el = document.getElementById(`task-comment-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      scrolledToComment.value = true;
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="border-t border-ui-line pt-5">
    <div class="flex items-center gap-2 mb-4">
      <MessageSquare class="w-4 h-4 text-ui-faint" />
      <h3 class="text-ui-h3 text-ui-ink">
        {{ $t("projects.comments.title") }}
        <span v-if="comments.length" class="text-ui-muted font-normal tabular-nums">({{ comments.length }})</span>
      </h3>
    </div>

    <!-- Comment List -->
    <div v-if="loading" class="space-y-4 mb-4">
      <div v-for="i in 2" :key="i" class="flex gap-3">
        <Skeleton width="32px" height="32px" rounded="9999px" class="shrink-0" />
        <div class="flex-1 space-y-2">
          <Skeleton width="33%" height="12px" />
          <Skeleton height="36px" rounded="8px" />
        </div>
      </div>
    </div>

    <div v-else-if="threads.length === 0" class="text-center py-6 mb-4 bg-ui-subtle rounded-ui-card">
      <MessageSquare class="w-5 h-5 text-ui-faint mx-auto mb-1.5" />
      <p class="text-ui-small text-ui-muted">{{ $t("projects.comments.empty") }}</p>
    </div>

    <div v-else class="space-y-5 mb-5 max-h-80 overflow-y-auto pr-1">
      <div v-for="thread in threads" :key="thread.root.id" class="space-y-3">
        <!-- Root comment -->
        <div class="flex gap-3 group">
          <Avatar :src="thread.root.user?.profile_photo" :alt="thread.root.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
          <div class="flex-1 min-w-0">
            <div
              :id="`task-comment-${thread.root.id}`"
              class="rounded-ui-control -mx-2 px-2 py-0.5 transition-colors duration-300"
              :class="{ 'bg-ui-accent-soft shadow-ui-focus': highlightCommentId === thread.root.id }"
            >
              <div class="flex items-center gap-2 min-w-0">
                <p class="text-ui-small font-medium text-ui-ink truncate" :title="thread.root.user?.name">{{ thread.root.user?.name }}</p>
                <span class="text-ui-cap text-ui-faint shrink-0">{{ getTimeAgo(thread.root.created_at) }}</span>
                <div class="ml-auto flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    v-if="canComment"
                    type="button"
                    @click="startReply(thread.root)"
                    class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
                    :title="$t('projects.comments.reply')"
                    :aria-label="$t('projects.comments.reply')"
                  >
                    <CornerUpLeft class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="thread.root.can_delete"
                    type="button"
                    @click="handleDelete(thread.root)"
                    class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                    :title="$t('projects.comments.delete')"
                    :aria-label="$t('projects.comments.delete')"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p class="text-ui-small text-ui-text leading-relaxed whitespace-pre-wrap break-words mt-0.5">
              <template v-for="(segment, idx) in renderSegments(thread.root)" :key="idx">
                <span v-if="segment.type === 'mention'" :class="mentionColorClass(segment.text)" class="font-medium rounded px-1">{{ segment.text }}</span>
                <a
                  v-else-if="segment.type === 'url'"
                  :href="segment.text"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-ui-accent underline hover:no-underline break-all"
                  >{{ segment.text }}</a
                >
                <a v-else-if="segment.type === 'email'" :href="`mailto:${segment.text}`" class="text-ui-accent underline hover:no-underline">{{ segment.text }}</a>
                <template v-else>{{ segment.text }}</template>
              </template>
              </p>
            </div>
          </div>
        </div>

        <!-- Replies -->
        <div v-if="thread.replies.length" class="ml-4 pl-5 sm:pl-7 space-y-3 border-l border-ui-line">
          <div v-for="reply in thread.replies" :key="reply.id" class="flex gap-3 group">
            <Avatar :src="reply.user?.profile_photo" :alt="reply.user?.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
            <div class="flex-1 min-w-0">
              <div
                :id="`task-comment-${reply.id}`"
                class="rounded-ui-control -mx-2 px-2 py-0.5 transition-colors duration-300"
                :class="{ 'bg-ui-accent-soft shadow-ui-focus': highlightCommentId === reply.id }"
              >
              <div class="flex items-center gap-2 min-w-0">
                <p class="text-ui-small font-medium text-ui-ink truncate" :title="reply.user?.name">{{ reply.user?.name }}</p>
                <span class="text-ui-cap text-ui-faint shrink-0">{{ getTimeAgo(reply.created_at) }}</span>
                <div class="ml-auto flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                  <button
                    v-if="canComment"
                    type="button"
                    @click="startReply(reply)"
                    class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-hover hover:text-ui-ink focus:outline-none focus-visible:shadow-ui-focus"
                    :title="$t('projects.comments.reply')"
                    :aria-label="$t('projects.comments.reply')"
                  >
                    <CornerUpLeft class="w-3.5 h-3.5" />
                  </button>
                  <button
                    v-if="reply.can_delete"
                    type="button"
                    @click="handleDelete(reply)"
                    class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                    :title="$t('projects.comments.delete')"
                    :aria-label="$t('projects.comments.delete')"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
                <p
                  v-if="reply.reply_to && reply.reply_to.id !== thread.root.id"
                  class="text-ui-cap text-ui-muted border-l-2 border-ui-line-strong pl-2 mt-1 mb-1 truncate"
                >
                  {{ $t("projects.comments.replyingTo") }} <span class="font-medium text-ui-text">{{ reply.reply_to.user_name }}</span>: {{ reply.reply_to.snippet }}
                </p>
                <p class="text-ui-small text-ui-text leading-relaxed whitespace-pre-wrap break-words mt-0.5">
              <template v-for="(segment, idx) in renderSegments(reply)" :key="idx">
                <span v-if="segment.type === 'mention'" :class="mentionColorClass(segment.text)" class="font-medium rounded px-1">{{ segment.text }}</span>
                <a
                  v-else-if="segment.type === 'url'"
                  :href="segment.text"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-ui-accent underline hover:no-underline break-all"
                  >{{ segment.text }}</a
                >
                <a v-else-if="segment.type === 'email'" :href="`mailto:${segment.text}`" class="text-ui-accent underline hover:no-underline">{{ segment.text }}</a>
                <template v-else>{{ segment.text }}</template>
              </template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Not eligible to comment -->
    <div v-if="!canComment" class="flex items-center gap-2.5 bg-ui-subtle border border-ui-line rounded-ui-control px-3.5 py-3">
      <MessageSquare class="w-4 h-4 text-ui-faint shrink-0" />
      <p class="text-ui-cap text-ui-muted">
        {{ $t("projects.comments.notEligible") }}
      </p>
    </div>

    <!-- Composer -->
    <div v-else class="flex gap-3">
      <div class="hidden sm:block shrink-0"><Avatar :src="user?.profile_photo" :alt="user?.name" size="w-8 h-8" icon-size="w-4 h-4" /></div>
      <div class="flex-1 min-w-0 relative">
        <!-- Replying-to banner -->
        <div v-if="replyingTo" class="flex items-center justify-between gap-2 bg-ui-accent-soft rounded-ui-control px-3 py-1.5 mb-2">
          <p class="text-ui-cap text-ui-accent">
            {{ $t("projects.comments.replyingTo") }} <span class="font-medium">{{ replyingTo.userName }}</span>
          </p>
          <button type="button" @click="cancelReply" class="text-ui-accent/70 hover:text-ui-accent transition-colors" :aria-label="$t('projects.comments.cancelReply')">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>

        <textarea
          ref="textareaRef"
          :value="newComment"
          @input="handleInput"
          @keydown.enter.exact.prevent="submitComment"
          rows="2"
          :placeholder="$t('projects.comments.placeholder')"
          class="block w-full bg-ui-surface rounded-ui-control px-3 pt-2.5 pb-11 text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong focus:border-ui-accent focus:shadow-ui-focus transition-shadow resize-none outline-none"
        ></textarea>

        <!-- Emoji + Send -->
        <div class="absolute bottom-2 right-2 flex items-center gap-1">
          <button
            ref="emojiButtonRef"
            type="button"
            @click="toggleEmojiPicker"
            class="task-comment-emoji-toggle w-8 h-8 rounded-ui-control flex items-center justify-center transition-colors"
            :class="showEmojiPicker ? 'text-ui-accent bg-ui-accent-soft' : 'text-ui-faint hover:text-ui-ink hover:bg-ui-hover'"
            :title="$t('projects.comments.insertEmoji')"
            :aria-label="$t('projects.comments.insertEmoji')"
          >
            <Smile class="w-4 h-4" />
          </button>
          <button
            type="button"
            @click="submitComment"
            :disabled="submitting || !newComment.trim()"
            class="ui-press w-8 h-8 rounded-ui-control flex items-center justify-center bg-ui-ink text-white hover:bg-ui-ink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            :title="replyingTo ? $t('projects.comments.reply') : $t('projects.comments.comment')"
            :aria-label="replyingTo ? $t('projects.comments.reply') : $t('projects.comments.comment')"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>

        <!-- Mention Dropdown (teleported so it always sits above the modal, unclipped) -->
        <Teleport to="body">
          <div
            v-if="showMentionDropdown && mentionResults.length > 0"
            :style="mentionDropdownStyle"
            class="bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay overflow-hidden max-h-56 overflow-y-auto w-72 p-1"
          >
            <button
              v-for="employee in mentionResults"
              :key="employee.id"
              type="button"
              @mousedown.prevent="selectMention(employee)"
              class="w-full px-2.5 py-2 rounded-md hover:bg-ui-hover transition-colors flex items-center gap-2.5 text-left"
            >
              <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-7 h-7" icon-size="w-3.5 h-3.5" />
              <div class="flex-1 min-w-0">
                <p class="text-ui-small font-medium text-ui-ink truncate">{{ employee.user?.name }}</p>
                <p class="text-ui-cap text-ui-muted truncate">{{ employee.job_information?.job_title }}</p>
              </div>
              <AtSign class="w-3.5 h-3.5 text-ui-faint shrink-0" />
            </button>
          </div>
        </Teleport>

        <!-- Emoji Picker (teleported so it always sits above the modal, unclipped) -->
        <Teleport to="body">
          <div
            v-if="showEmojiPicker"
            :style="emojiPickerStyle"
            class="task-comment-emoji-picker bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-2 grid grid-cols-8 gap-1 w-64"
          >
            <button
              v-for="emoji in EMOJIS"
              :key="emoji"
              type="button"
              @mousedown.prevent="insertEmoji(emoji)"
              class="w-7 h-7 flex items-center justify-center text-ui-h3 rounded-md hover:bg-ui-hover transition-colors"
            >
              {{ emoji }}
            </button>
          </div>
        </Teleport>
      </div>
    </div>
  </section>
</template>
