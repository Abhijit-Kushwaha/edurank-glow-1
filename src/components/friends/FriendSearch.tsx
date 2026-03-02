import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SearchResult {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface FriendSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onAddFriend: (userId: string) => Promise<void>;
}

const FriendSearch = ({ onSearch, onAddFriend }: FriendSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await onSearch(query.trim());
      setResults(data);
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (userId: string) => {
    setAddingId(userId);
    try {
      await onAddFriend(userId);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Search by username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          size="icon"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.userId}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={r.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {r.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{r.name}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAdd(r.userId)}
                disabled={addingId === r.userId}
              >
                {addingId === r.userId ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <UserPlus className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {!searching && results.length === 0 && query.trim() && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No users found.
        </p>
      )}
    </div>
  );
};

export default FriendSearch;
