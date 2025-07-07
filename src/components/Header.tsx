
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Bell, User, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut, userSubscription } = useAuth();
  const navigate = useNavigate();

  const getSubscriptionTier = () => {
    return userSubscription?.subscription_tier || 'Free';
  };

  const getSubscriptionBadgeColor = () => {
    const tier = getSubscriptionTier();
    switch (tier) {
      case 'Professional':
        return 'bg-blue-600/20 text-blue-300 border-blue-500/30';
      case 'Enterprise':
        return 'bg-purple-600/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-green-600/20 text-green-300 border-green-500/30';
    }
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  return (
    <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CB</span>
              </div>
              <h1 className="text-xl font-bold text-white">AEGIS AI</h1>
            </div>
            {user && (
              <Badge variant="secondary" className={getSubscriptionBadgeColor()}>
                {getSubscriptionTier()} Plan
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  <Settings className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-slate-700 text-white">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-slate-800 border-slate-700" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none text-white">
                          {user?.user_metadata?.full_name || user?.email}
                        </p>
                        <p className="text-xs leading-none text-slate-400">
                          {user?.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem
                      className="text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                      onClick={signOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button 
                onClick={handleSignIn}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
