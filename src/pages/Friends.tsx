import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  MessageCircle,
  UserPlus,
  ArrowLeft,
  Check,
  X,
  Trash2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Logo from "@/components/Logo";
import { useFriends, Friend } from "@/hooks/useFriends";
import { usePresence } from "@/hooks/usePresence";
import FriendSearch from "@/components/friends/FriendSearch";
import InviteFriend from "@/components/friends/InviteFriend";
import ChatWindow from "@/components/friends/ChatWindow";
import OnlineIndicator from "@/components/friends/OnlineIndicator";

const Friends = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    friends,
    pendingRequests,
    loading,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    generateInviteCode,
    redeemInviteCode,
    searchUsers,
  } = useFriends();

  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const { isOnline } = usePresence(friendIds);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [activeTab, setActiveTab] = useState("friends");

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const aOnline = isOnline(a.id) ? 1 : 0;
        const bOnline = isOnline(b.id) ? 1 : 0;
        return bOnline - aOnline;
      }),
    [friends, isOnline],
  );

  useEffect(() => {
    const state = location.state as { chatWith?: string } | null;
    if (state?.chatWith && friends.length > 0) {
      const friend = friends.find((f) => f.id === state.chatWith);
      if (friend) {
        setSelectedFriend(friend);
        setActiveTab("friends");
      }
    }
  }, [location.state, friends]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo size="sm" />
          <h1 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Friends
          </h1>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive">
              {pendingRequests.length} pending
            </Badge>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          <div className="lg:col-span-1 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="friends">
                  <Users className="h-4 w-4 mr-1" />
                  Friends
                </TabsTrigger>
                <TabsTrigger value="add">
                  <UserPlus className="h-4 w-4 mr-1" />
                  Add
                </TabsTrigger>
                <TabsTrigger value="requests">
                  Requests
                  {pendingRequests.length > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-1 text-xs h-5 w-5 p-0 flex items-center justify-center"
                    >
                      {pendingRequests.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="mt-4 space-y-2">
                {friends.length === 0 ? (
                  <div className="text-center py-8 glass-card rounded-xl">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      No friends yet.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab("add")}
                    >
                      <UserPlus className="h-4 w-4 mr-1" /> Add Friends
                    </Button>
                  </div>
                ) : (
                  sortedFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors cursor-pointer ${
                        selectedFriend?.id === friend.id
                          ? "bg-primary/10 border border-primary/30"
                          : "glass-card hover:bg-muted/50"
                      }`}
                      onClick={() => setSelectedFriend(friend)}
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary">
                            {friend.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <OnlineIndicator
                          isOnline={isOnline(friend.id)}
                          size="md"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {friend.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isOnline(friend.id) ? (
                            <span className="text-success">Online</span>
                          ) : (
                            `${friend.totalXp} XP`
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFriend(friend);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFriend(friend.friendshipId);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="add" className="mt-4 space-y-6">
                <div className="glass-card rounded-xl p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search Users
                  </h3>
                  <FriendSearch
                    onSearch={searchUsers}
                    onAddFriend={sendFriendRequest}
                  />
                </div>
                <div className="glass-card rounded-xl p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Invite
                  </h3>
                  <InviteFriend
                    onGenerateCode={generateInviteCode}
                    onRedeemCode={redeemInviteCode}
                  />
                </div>
              </TabsContent>

              <TabsContent value="requests" className="mt-4 space-y-2">
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8 glass-card rounded-xl">
                    <p className="text-muted-foreground text-sm">
                      No pending requests.
                    </p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 glass-card rounded-xl"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={req.avatarUrl || undefined} />
                        <AvatarFallback className="bg-secondary/20 text-secondary">
                          {req.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{req.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Wants to be friends
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          className="h-8 w-8 bg-success hover:bg-success/90"
                          onClick={() => acceptRequest(req.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => rejectRequest(req.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-2 glass-card rounded-2xl flex flex-col min-h-[500px]">
            {selectedFriend ? (
              <>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={selectedFriend.avatarUrl || undefined}
                        />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {selectedFriend.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <OnlineIndicator
                        isOnline={isOnline(selectedFriend.id)}
                        size="md"
                      />
                    </div>
                    <div>
                      <p className="font-medium">{selectedFriend.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline(selectedFriend.id) ? (
                          <span className="text-success">Online</span>
                        ) : (
                          "Offline"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatWindow
                    friendUserId={selectedFriend.id}
                    friendName={selectedFriend.name}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-8">
                <div>
                  <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-medium text-muted-foreground mb-1">
                    Select a friend to chat
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose a friend from the list or add new friends.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Friends;
