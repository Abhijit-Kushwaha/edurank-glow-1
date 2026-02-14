import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  BookOpen,
  Gamepad2,
  Code,
  User,
  Settings,
  Zap,
  FileText,
  Play,
  Trophy,
  Coins,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import { useCoins } from '@/contexts/CoinContext';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { coins } = useCoins();
  const [isOpen, setIsOpen] = useState(true);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navSections = [
    {
      title: '📘 Learning',
      items: [
        { icon: <BookOpen className="h-4 w-4" />, label: 'Dashboard', path: '/dashboard' },
        { icon: <FileText className="h-4 w-4" />, label: 'AI Notes', path: '/ai-notes' },
        { icon: <Zap className="h-4 w-4" />, label: 'AI Quiz', path: '/ai-quiz' },
        { icon: <Play className="h-4 w-4" />, label: 'Video Search', path: '/video-search' },
      ],
    },
    {
      title: '🎮 Games',
      items: [
        { icon: <Gamepad2 className="h-4 w-4" />, label: 'All Games', path: '/games' },
      ],
    },
    {
      title: '💻 Coding Lab',
      items: [
        { icon: <Code className="h-4 w-4" />, label: 'AI Coding Assistant', path: '/coding-lab' },
      ],
    },
    {
      title: '👤 Profile',
      items: [
        { icon: <User className="h-4 w-4" />, label: 'Profile', path: '/profile' },
        { icon: <Trophy className="h-4 w-4" />, label: 'Quiz History', path: '/quiz-history' },
        { icon: <Coins className="h-4 w-4" />, label: 'Leaderboard', path: '/leaderboard' },
      ],
    },
    {
      title: '⚙️ Settings',
      items: [
        { icon: <Settings className="h-4 w-4" />, label: 'Settings', path: '/settings' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-40 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen z-40 w-64 glass-card border-r border-border/50 flex flex-col transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border/50">
          <Logo size="sm" />
        </div>

        {/* Coin Balance */}
        <div className="px-4 py-3 bg-primary/5 border-b border-border/30 flex items-center gap-2">
          <div className="text-yellow-400 font-bold text-lg">🪙</div>
          <div>
            <div className="text-xs text-muted-foreground">Coins</div>
            <div className="text-lg font-bold">{coins}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setIsOpen(false); // Close sidebar on mobile after navigation
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left text-sm ${
                        isActive(item.path)
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/about')}
          >
            About
          </Button>
        </div>
      </aside>

      {/* Main content offset */}
      <main className="md:ml-64">
        {/* This wrapper ensures content doesn't go under sidebar */}
      </main>
    </>
  );
};

export default Sidebar;
