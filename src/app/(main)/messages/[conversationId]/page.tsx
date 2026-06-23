"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Send, ShieldCheck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/constants/query-keys";
import { cryptoService, messagingService } from "@/lib/api/services";
import { extractErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, PageSpinner } from "@/components/ui/states";
import type { EncryptedMessageRecord, Message } from "@/types";

type ChatSecurityMode = "normal" | "e2ee";

function normalizePlainMessages(input: unknown): Message[] {
  if (Array.isArray(input)) return input as Message[];

  if (input && typeof input === "object") {
    const object = input as { results?: unknown; data?: unknown };

    if (Array.isArray(object.results)) return object.results as Message[];

    if (Array.isArray(object.data)) return object.data as Message[];

    if (
      object.data &&
      typeof object.data === "object" &&
      Array.isArray((object.data as { results?: unknown }).results)
    ) {
      return (object.data as { results: Message[] }).results;
    }
  }

  return [];
}

function normalizeEncryptedMessages(input: unknown): EncryptedMessageRecord[] {
  if (Array.isArray(input)) return input as EncryptedMessageRecord[];

  if (input && typeof input === "object") {
    const object = input as { results?: unknown; data?: unknown };

    if (Array.isArray(object.results)) {
      return object.results as EncryptedMessageRecord[];
    }

    if (Array.isArray(object.data)) {
      return object.data as EncryptedMessageRecord[];
    }

    if (
      object.data &&
      typeof object.data === "object" &&
      Array.isArray((object.data as { results?: unknown }).results)
    ) {
      return (object.data as { results: EncryptedMessageRecord[] }).results;
    }
  }

  return [];
}

function getSecurityStorageKey(conversationId: string): string {
  return `qalbconverfy_chat_security_${conversationId}`;
}

function readStoredSecurityMode(conversationId: string): ChatSecurityMode {
  if (typeof window === "undefined") return "normal";
  const stored = window.localStorage.getItem(getSecurityStorageKey(conversationId));
  return stored === "e2ee" ? "e2ee" : "normal";
}

function storeSecurityMode(conversationId: string, mode: ChatSecurityMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getSecurityStorageKey(conversationId), mode);
}

export default function ConversationDetailPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;
  const currentUser = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [body, setBody] = useState("");
  const [securityMode, setSecurityMode] = useState<ChatSecurityMode>(() =>
    readStoredSecurityMode(conversationId),
  );

  const {
    data: conversation,
    isLoading: conversationLoading,
    isError: conversationError,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: queryKeys.conversation(conversationId),
    queryFn: () => messagingService.getConversation(conversationId),
  });

  const {
  data: plainMessagesData,
  isLoading: plainLoading,
  isError: plainError,
  refetch: refetchPlainMessages,
} = useQuery({
  queryKey: queryKeys.conversationMessages(conversationId),
  queryFn: () => messagingService.getMessages(conversationId),
  enabled: securityMode === "normal",
  refetchInterval: securityMode === "normal" ? 2000 : false,
  refetchIntervalInBackground: true,
  refetchOnWindowFocus: true,
});

  const {
    data: cryptoDevicesData,
    isLoading: cryptoDevicesLoading,
  } = useQuery({
    queryKey: queryKeys.cryptoDevices,
    queryFn: () => cryptoService.listDevices(),
    enabled: securityMode === "e2ee",
  });

  const activeCryptoDevice = useMemo(() => {
    const devices = cryptoDevicesData?.results ?? [];
    return devices.find((device) => device.status === "active") ?? devices[0] ?? null;
  }, [cryptoDevicesData]);

  const {
    data: encryptedMessagesData,
    isLoading: encryptedLoading,
    isError: encryptedError,
    refetch: refetchEncryptedMessages,
  } = useQuery({
    queryKey: ["crypto", "messages", conversationId, activeCryptoDevice?.device_id ?? null],
    queryFn: () =>
      cryptoService.listMessages(conversationId, activeCryptoDevice?.device_id ?? ""),
    enabled: securityMode === "e2ee" && Boolean(activeCryptoDevice?.device_id),
  });

  const plainMessages = normalizePlainMessages(plainMessagesData);
  const encryptedMessages = normalizeEncryptedMessages(encryptedMessagesData);
  const loading =
    conversationLoading ||
    (securityMode === "normal" ? plainLoading : cryptoDevicesLoading || encryptedLoading);
  const error =
    conversationError ||
    (securityMode === "normal" ? plainError : encryptedError);

  const otherParticipant = conversation?.participants?.find(
    (participant) => participant.user.id !== currentUser?.id,
  )?.user;

  const title =
    conversation?.conversation_type === "group"
      ? conversation.title || "Group conversation"
      : otherParticipant?.username
        ? `@${otherParticipant.username}`
        : "Conversation";

  const sendPlainMutation = useMutation({
    mutationFn: () =>
      messagingService.sendMessage(conversationId, {
        body: body.trim(),
        message_type: "text",
      }),
    onSuccess: async () => {
  setBody("");

  await queryClient.invalidateQueries({
    queryKey: queryKeys.conversationMessages(conversationId),
  });

  await queryClient.invalidateQueries({
    queryKey: queryKeys.conversations,
  });

  await refetchPlainMessages();
},
  });


  function changeSecurityMode(mode: ChatSecurityMode) {
    setSecurityMode(mode);
    storeSecurityMode(conversationId, mode);
  }

  function submitMessage() {
    if (!body.trim()) return;

    if (securityMode === "e2ee") {
      toast.info(
        "E2EE selected",
        "This chat is set to secure mode. Client-side encryption setup is required before sending."
      );
      return;
    }

    sendPlainMutation.mutate();
  }

  if (loading) return <PageSpinner label="Loading conversation..." />;

  if (error) {
    return (
      <ErrorState
        description="Could not load this conversation."
        onRetry={() =>
          securityMode === "normal"
            ? refetchPlainMessages()
            : refetchEncryptedMessages() || refetchConversation()
        }
      />
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col lg:h-screen">
      <header className="border-b border-border bg-background/95 px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar
            src={otherParticipant?.avatar_url ?? null}
            username={title}
            size="sm"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-text-primary">
              {title}
            </h1>
            <p className="truncate text-xs text-text-tertiary">
              {securityMode === "e2ee"
                ? "Secure chat selected"
                : "Normal chat selected"}
            </p>
          </div>

          <div className="flex rounded-xl border border-border bg-surface p-1">
            <button
              type="button"
              onClick={() => changeSecurityMode("normal")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                securityMode === "normal"
                  ? "bg-accent text-accent-foreground"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => changeSecurityMode("e2ee")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium",
                securityMode === "e2ee"
                  ? "bg-accent text-accent-foreground"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Lock className="h-3 w-3" />
              E2EE
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {securityMode === "normal" ? (
          plainMessages.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Say hello to start the conversation."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {plainMessages.map((message) => {
                const isMine = message.sender?.id === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}
                  >
                    {!isMine && message.sender && (
                      <Avatar
                        src={message.sender.avatar_url}
                        username={message.sender.username}
                        size="xs"
                      />
                    )}
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                        isMine
                          ? "bg-accent text-accent-foreground"
                          : "bg-surface-raised text-text-primary",
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : !activeCryptoDevice ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="E2EE device is not configured"
            description="Register an E2EE device in security settings before sending encrypted messages."
          />
        ) : encryptedMessages.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="No secure messages yet"
            description="E2EE mode is selected. Messages here use the crypto messaging backend."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {encryptedMessages.map((message) => {
              const isMine = message.sender?.id === currentUser?.id;
              return (
                <div
                  key={message.id}
                  className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}
                >
                  {!isMine && message.sender && (
                    <Avatar
                      src={message.sender.avatar_url}
                      username={message.sender.username}
                      size="xs"
                    />
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                      isMine
                        ? "bg-accent text-accent-foreground"
                        : "bg-surface-raised text-text-primary",
                    )}
                  >
                    <p className="break-all text-xs opacity-80">{message.ciphertext}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitMessage();
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          placeholder={
            securityMode === "e2ee"
              ? "Type a secure message..."
              : "Type a message..."
          }
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={securityMode === "e2ee"}
          className="h-11 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <Button
          type="submit"
          size="md"
          isLoading={sendPlainMutation.isPending}
          disabled={!body.trim() || securityMode === "e2ee"}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
