import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriends } from '@/hooks/useFriends';
import { usePresence } from '@/hooks/usePresence';
import OnlineIndicator from './OnlineIndicator';
import { useMemo } from 'react';

const FriendsWidget = () => {
  const navigate = useNavigate();
  const { friends, pendingRequests, loading } = useFriends();

  // Extract friend IDs for presence tracking
  const friendIds = useMemo(() => friends.map((f) => f.id), [friends]);
  const { isOnline } = usePresence(friendIds);

  // Sort friends: online first
  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const aOnline = isOnline(a.id) ? 1 : 0;
        const bOnline = isOnline(b.id) ? 1 : 0;
        return bOnline - aOnline;
      }),
    [friends, isOnline]
  );

  return (
    <div className="glass-card rounded-2xl p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-secondary/10">
            <Users className="h-5 w-5 text-secondary" />
          </div>
          <h3 className="font-semibold">Friends</h3>
          {pendingRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/friends')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
      ) : friends.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">No friends yet. Invite someone!</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/friends')}>
            <UserPlus className="h-4 w-4 mr-1" /> Add Friends
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFriends.slice(0, 4).map((friend) => (
            <button
              key={friend.id}
              onClick={() => navigate('/friends', { state: { chatWith: friend.id } })}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={friend.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {friend.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <OnlineIndicator isOnline={isOnline(friend.id)} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{friend.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline(friend.id) ? (
                    <span className="text-success">Online</span>
                  ) : (
                    `${friend.totalXp} XP`
                  )}
                </p>
              </div>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          {friends.length > 4 && (
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/friends')}>
              View all {friends.length} friends
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default FriendsWidget;
