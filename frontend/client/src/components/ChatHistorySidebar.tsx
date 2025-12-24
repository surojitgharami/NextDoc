import { useUser } from "@/context/auth-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Conversation, GroupedConversations } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, MoreVertical, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ChatHistorySidebarProps {
  onConversationSelect?: (conversationId: string) => void;
  selectedConversationId?: string | null;
  className?: string;
}

export default function ChatHistorySidebar({
  onConversationSelect,
  selectedConversationId,
  className,
}: ChatHistorySidebarProps) {
  const { user } = useUser();

  // Fetch flat list of conversations from backend
  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: user?.id ? [`/api/conversations?userId=${user.id}`] : ['conversations-disabled'],
    enabled: !!user?.id,
  });

  // Group conversations by time period (like AppSidebarChat does)
  const groupedConversations = useMemo<GroupedConversations>(() => {
    if (!conversations || !Array.isArray(conversations)) {
      return { today: [], previous7Days: [], previous30Days: [] };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter out deleted conversations
    const activeConversations = conversations.filter(conv => conv.isDeleted !== "true");

    const today = activeConversations.filter(
      (conv) => new Date(conv.createdAt) > oneDayAgo
    );
    const previous7Days = activeConversations.filter(
      (conv) => new Date(conv.createdAt) <= oneDayAgo && new Date(conv.createdAt) > sevenDaysAgo
    );
    const previous30Days = activeConversations.filter(
      (conv) => new Date(conv.createdAt) <= sevenDaysAgo && new Date(conv.createdAt) > thirtyDaysAgo
    );

    return { today, previous7Days, previous30Days };
  }, [conversations]);

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) return;
      return apiRequest("PUT", `/api/conversations/${conversationId}/favorite?userId=${user.id}`);
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/conversations?userId=${user.id}`] });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user?.id) return;
      return apiRequest("DELETE", `/api/conversations/${conversationId}?userId=${user.id}`);
    },
    onSuccess: () => {
      if (!user?.id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/conversations?userId=${user.id}`] });
    },
  });

  const isPending = toggleFavoriteMutation.isPending || deleteConversationMutation.isPending;

  const renderConversation = (conversation: any) => (
    <div
      key={conversation.id}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer",
        "hover-elevate active-elevate-2 transition-colors",
        selectedConversationId === conversation.id ? "bg-muted" : "bg-background"
      )}
      onClick={() => onConversationSelect?.(conversation.id)}
      data-testid={`conversation-${conversation.id}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">
          {conversation.title}
        </p>
      </div>

      {/* Favorite indicator and menu */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {conversation.isFavorite === 'true' && (
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        )}
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              disabled={isPending}
              data-testid={`menu-${conversation.id}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                if (!isPending) {
                  toggleFavoriteMutation.mutate(conversation.id);
                }
              }}
              disabled={isPending}
              data-testid={`favorite-${conversation.id}`}
            >
              <Star className="w-4 h-4 mr-2" />
              {conversation.isFavorite === 'true' ? 'Unfavorite' : 'Favorite'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (!isPending) {
                  deleteConversationMutation.mutate(conversation.id);
                }
              }}
              disabled={isPending}
              data-testid={`delete-${conversation.id}`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className={cn("h-full bg-background border-r flex flex-col", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <h2 className="text-lg font-semibold text-foreground">Chat History</h2>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {error ? (
            <div className="text-center text-destructive py-8 px-4">
              <p className="font-medium">Failed to load history</p>
              <p className="text-sm text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading history...
            </div>
          ) : !groupedConversations || (
            groupedConversations.today.length === 0 &&
            groupedConversations.previous7Days.length === 0 &&
            groupedConversations.previous30Days.length === 0
          ) ? (
            <div className="text-center text-muted-foreground py-8 px-4">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>No chat history yet</p>
            </div>
          ) : (
            <>
              {/* Today */}
              {groupedConversations.today.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                    Today
                  </h3>
                  {groupedConversations.today.map(renderConversation)}
                </div>
              )}

              {/* Previous 7 Days */}
              {groupedConversations.previous7Days.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                    Previous 7 Days
                  </h3>
                  {groupedConversations.previous7Days.map(renderConversation)}
                </div>
              )}

              {/* Previous 30 Days */}
              {groupedConversations.previous30Days.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-muted-foreground px-3 mb-2">
                    Previous 30 Days
                  </h3>
                  {groupedConversations.previous30Days.map(renderConversation)}
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
