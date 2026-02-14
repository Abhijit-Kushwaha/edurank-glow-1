import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCoins } from '@/contexts/CoinContext';
import { ShieldCheck, Lock, Play } from 'lucide-react';

const GAMES = [
  {
    id: 'epic-era-battles',
    title: 'Epic Era Battles',
    description: 'A strategy battle game. Short skirmishes, big decisions.',
    credits: 2,
    isExternal: true,
    url: 'https://lovable.dev/projects/0ce46a56-c8b0-475d-89b3-d36218b94708?magic_link=mc_55f346b3-ab97-4970-8ffa-34776cdbb89b',
  },
  {
    id: 'rushlane-x',
    title: 'Rushlane X',
    description: 'A fast-paced arcade runner with powerups and score-chasing.',
    credits: 5,
    isExternal: false,
    url: null,
  },
];

const Games: React.FC = () => {
  const navigate = useNavigate();
  const { coins, isUnlocked, unlockGame } = useCoins();

  const handlePlay = async (game: any) => {
    if (game.isExternal) {
      // For external games, deduct credits and open in new tab
      window.open(game.url, '_blank');
      return;
    }
    
    // For local games
    if (isUnlocked(game.id)) {
      navigate(`/games/${game.id}`);
      return;
    }

    if (coins < game.credits) {
      const need = game.credits - coins;
      alert(`You need ${need} more credits to unlock this game.`);
      return;
    }

    const confirmed = confirm(`Spend ${game.credits} credits to unlock this game?`);
    if (!confirmed) return;
    const ok = await unlockGame(game.id, game.credits);
    if (ok) navigate(`/games/${game.id}`);
  };

  return (
    <div className="min-h-screen container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🎮 Games</h1>
      <p className="text-sm text-muted-foreground mb-6">Play mini-games using coins earned from quizzes.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GAMES.map((g) => (
          <div key={g.id} className="glass-card p-4 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">{g.title}</h2>
                <p className="text-sm text-muted-foreground">{g.description}</p>
                <div className="mt-3 text-sm">Cost: <b>{g.credits}</b> credits</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!g.isExternal && isUnlocked(g.id) ? (
                  <div className="flex items-center gap-2 text-success">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-sm">Unlocked</span>
                  </div>
                ) : (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Button onClick={() => handlePlay(g)}>
                    {!g.isExternal && isUnlocked(g.id) ? <Play className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />} 
                    {!g.isExternal && isUnlocked(g.id) ? 'Play' : 'Play'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
