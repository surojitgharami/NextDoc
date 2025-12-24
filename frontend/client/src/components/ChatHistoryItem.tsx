import { useState } from "react";
import { MoreVertical, Share2, Edit2, Trash2, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Conversation } from "@shared/schema";
import type { ChatSession } from "@/lib/api-hooks";

interface ChatHistoryItemProps {
  conversation?: Conversation;
  session?: ChatSession;
  isActive?: boolean;
  onSelect: (id: string) => void;
  onRename?: (id: string, newTitle: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void;
}

export default function ChatHistoryItem({
  conversation,
  session,
  isActive = false,
  onSelect,
  onRename,
  onDelete,
  onShare,
  onPin,
}: ChatHistoryItemProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const id = session?.session_id || conversation?.id || "";
  const title = session?.session_name || conversation?.title || "Untitled";
  const isPinned = session?.is_pinned || false;
  const summary = session?.summary;
  const preview = session?.preview;
  const messageCount = session?.message_count || 0;
  
  const [newTitle, setNewTitle] = useState(title);

  const handleRename = () => {
    if (newTitle.trim() && onRename) {
      onRename(id, newTitle.trim());
      setShowRenameDialog(false);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(id);
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(id);
    }
  };

  const handleTogglePin = () => {
    if (onPin) {
      onPin(id, !isPinned);
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <div className="group relative flex items-center w-full rounded-lg hover-elevate">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton
                  isActive={isActive}
                  onClick={() => onSelect(id)}
                  className="flex-1 justify-start px-3 py-2 h-auto min-h-[2.5rem] rounded-lg"
                  data-testid={`button-open-${id}`}
                >
                  <div className="flex items-center gap-2 w-full min-w-0">
                    {isPinned && (
                      <Pin className="w-3 h-3 flex-shrink-0 text-primary" />
                    )}
                    <span className="truncate text-sm flex-1" data-testid={`text-chat-title-${id}`}>
                      {title}
                    </span>
                    {messageCount > 0 && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {messageCount}
                      </span>
                    )}
                  </div>
                </SidebarMenuButton>
              </TooltipTrigger>
              {(summary || preview) && (
                <TooltipContent side="right" className="max-w-[300px]">
                  <div className="space-y-1">
                    {summary && (
                      <p className="text-xs">{summary}</p>
                    )}
                    {!summary && preview && (
                      <p className="text-xs text-muted-foreground">{preview}</p>
                    )}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 group-focus-within:opacity-100 transition-opacity h-7 w-7 flex-shrink-0"
                data-testid={`button-menu-${id}`}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onPin && session && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePin();
                  }}
                  data-testid={`button-pin-${id}`}
                >
                  {isPinned ? (
                    <>
                      <PinOff className="w-4 h-4 mr-2" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-4 h-4 mr-2" />
                      Pin to top
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                data-testid={`button-share-${id}`}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setNewTitle(title);
                  setShowRenameDialog(true);
                }}
                data-testid={`button-rename-${id}`}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
                className="text-destructive focus:text-destructive"
                data-testid={`button-delete-${id}`}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>

      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for this conversation
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                }
              }}
              className="mt-2"
              data-testid="input-rename-title"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRenameDialog(false)} data-testid="button-cancel-rename">
              Cancel
            </Button>
            <Button onClick={handleRename} data-testid="button-confirm-rename">
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
