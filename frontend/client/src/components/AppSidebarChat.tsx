import { Plus, Search, ChevronDown, Pin, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import ChatHistoryItem from "@/components/ChatHistoryItem";
import type { Conversation } from "@shared/schema";
import type { ChatSession } from "@/lib/api-hooks";

interface AppSidebarChatProps {
  conversations?: Conversation[];
  sessions?: ChatSession[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onDeleteConversation?: (id: string) => void;
  onShareConversation?: (id: string) => void;
  onPinConversation?: (id: string, pinned: boolean) => void;
  mode?: "simple" | "symptom_checker";
}

function AppSidebarChatContent({
  conversations = [],
  sessions = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onDeleteConversation,
  onShareConversation,
  onPinConversation,
  mode = "simple",
}: AppSidebarChatProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPinnedOpen, setIsPinnedOpen] = useState(true);
  const [isAllChatsOpen, setIsAllChatsOpen] = useState(true);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const useSessions = sessions.length > 0;
  
  const filteredSessions = useSessions
    ? sessions.filter((session) =>
        searchQuery === "" ||
        (session.session_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.preview || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (session.summary || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredConversations = !useSessions
    ? conversations.filter(
        (conv) =>
          conv.mode === mode &&
          conv.isDeleted !== "true" &&
          (searchQuery === "" || conv.title.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const pinnedSessions = filteredSessions.filter((s) => s.is_pinned);
  const unpinnedSessions = filteredSessions.filter((s) => !s.is_pinned);

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const getSessionsByTimeGroup = (sessionsToGroup: ChatSession[]) => {
    const today = sessionsToGroup.filter(
      (s) => new Date(s.created_at) > oneDayAgo
    );
    const previous7Days = sessionsToGroup.filter(
      (s) => new Date(s.created_at) <= oneDayAgo && new Date(s.created_at) > sevenDaysAgo
    );
    const previous30Days = sessionsToGroup.filter(
      (s) => new Date(s.created_at) <= sevenDaysAgo && new Date(s.created_at) > thirtyDaysAgo
    );
    const older = sessionsToGroup.filter(
      (s) => new Date(s.created_at) <= thirtyDaysAgo
    );
    return { today, previous7Days, previous30Days, older };
  };

  const groupedSessions = getSessionsByTimeGroup(unpinnedSessions);

  const getConversationsByTimeGroup = (convsToGroup: Conversation[]) => {
    const today = convsToGroup.filter(
      (conv) => new Date(conv.createdAt) > oneDayAgo
    );
    const previous7Days = convsToGroup.filter(
      (conv) => new Date(conv.createdAt) <= oneDayAgo && new Date(conv.createdAt) > sevenDaysAgo
    );
    const previous30Days = convsToGroup.filter(
      (conv) => new Date(conv.createdAt) <= sevenDaysAgo && new Date(conv.createdAt) > thirtyDaysAgo
    );
    return { today, previous7Days, previous30Days };
  };

  const groupedConversations = getConversationsByTimeGroup(filteredConversations);

  const renderSessionList = (sessionList: ChatSession[], showTimeLabel?: string) => (
    <div className="mb-4">
      {showTimeLabel && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {showTimeLabel}
        </div>
      )}
      <SidebarMenu>
        {sessionList.map((session) => (
          <ChatHistoryItem
            key={session.session_id}
            session={session}
            isActive={session.session_id === activeConversationId}
            onSelect={onSelectConversation}
            onRename={onRenameConversation}
            onDelete={onDeleteConversation}
            onShare={onShareConversation}
            onPin={onPinConversation}
          />
        ))}
      </SidebarMenu>
    </div>
  );

  const renderConversationList = (convList: Conversation[], showTimeLabel?: string) => (
    <div className="mb-4">
      {showTimeLabel && (
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          {showTimeLabel}
        </div>
      )}
      <SidebarMenu>
        {convList.map((conversation) => (
          <ChatHistoryItem
            key={conversation.id}
            conversation={conversation}
            isActive={conversation.id === activeConversationId}
            onSelect={onSelectConversation}
            onRename={onRenameConversation}
            onDelete={onDeleteConversation}
            onShare={onShareConversation}
          />
        ))}
      </SidebarMenu>
    </div>
  );

  return (
    <>
      {!isCollapsed && (
        <SidebarHeader className="p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center">
              <Stethoscope className="w-5 h-5" />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="w-full justify-start gap-2 h-10 rounded-lg border-input hover-elevate"
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-lg border-input bg-background"
              data-testid="input-search"
            />
          </div>
        </SidebarHeader>
      )}

      {!isCollapsed && (
        <SidebarContent className="px-2">
          {useSessions ? (
            <>
              {pinnedSessions.length > 0 && (
                <Collapsible open={isPinnedOpen} onOpenChange={setIsPinnedOpen}>
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger
                        className="flex items-center justify-between w-full py-2 px-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors mb-1"
                        data-testid="collapsible-pinned"
                      >
                        <span className="font-semibold flex items-center gap-1.5">
                          <Pin className="w-3.5 h-3.5" />
                          Pinned
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isPinnedOpen ? "" : "-rotate-90"}`}
                        />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarGroupContent>
                        {renderSessionList(pinnedSessions)}
                      </SidebarGroupContent>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>
              )}

              <Collapsible open={isAllChatsOpen} onOpenChange={setIsAllChatsOpen}>
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger
                      className="flex items-center justify-between w-full py-2 px-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors mb-1"
                      data-testid="collapsible-all-chats"
                    >
                      <span className="font-semibold">All Chats</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isAllChatsOpen ? "" : "-rotate-90"}`}
                      />
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      {groupedSessions.today.length > 0 && renderSessionList(groupedSessions.today, "Today")}
                      {groupedSessions.previous7Days.length > 0 && renderSessionList(groupedSessions.previous7Days, "Previous 7 days")}
                      {groupedSessions.previous30Days.length > 0 && renderSessionList(groupedSessions.previous30Days, "Previous 30 days")}
                      {groupedSessions.older.length > 0 && renderSessionList(groupedSessions.older, "Older")}

                      {filteredSessions.length === 0 && (
                        <div className="text-center py-8 text-sm text-muted-foreground px-2">
                          {searchQuery ? "No conversations found" : "No conversations yet"}
                        </div>
                      )}
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            </>
          ) : (
            <Collapsible open={isAllChatsOpen} onOpenChange={setIsAllChatsOpen}>
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger
                    className="flex items-center justify-between w-full py-2 px-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors mb-1"
                    data-testid="collapsible-all-chats"
                  >
                    <span className="font-semibold">All Chats</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isAllChatsOpen ? "" : "-rotate-90"}`}
                    />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    {groupedConversations.today.length > 0 && renderConversationList(groupedConversations.today, "Today")}
                    {groupedConversations.previous7Days.length > 0 && renderConversationList(groupedConversations.previous7Days, "Previous 7 days")}
                    {groupedConversations.previous30Days.length > 0 && renderConversationList(groupedConversations.previous30Days, "Previous 30 days")}

                    {filteredConversations.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground px-2">
                        {searchQuery ? "No conversations found" : "No conversations yet"}
                      </div>
                    )}
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}
        </SidebarContent>
      )}

      <SidebarFooter className="p-4">
      </SidebarFooter>
    </>
  );
}

export function AppSidebarChat(props: AppSidebarChatProps) {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <AppSidebarChatContent {...props} />
    </Sidebar>
  );
}
