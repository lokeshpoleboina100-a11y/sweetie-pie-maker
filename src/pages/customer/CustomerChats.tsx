import { useNavigate } from 'react-router-dom';
import AppHeader from '@/components/AppHeader';
import BottomNav from '@/components/BottomNav';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const chats = [
  { id: '1', name: 'Murugan P.', lastMsg: 'Sure, I will bring everything needed 👍', time: '9:06 AM', unread: 1 },
  { id: '2', name: 'Senthil K.', lastMsg: 'I can start tomorrow morning', time: '8:45 AM', unread: 0 },
];

export default function CustomerChats() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Messages" />
      <div className="max-w-lg mx-auto px-4 py-4 space-y-2">
        {chats.map((chat) => (
          <Card
            key={chat.id}
            className="flex items-center gap-3 p-4 cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => navigate(`/customer/chat/${chat.id}`)}
          >
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {chat.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm">{chat.name}</h4>
                <span className="text-xs text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{chat.lastMsg}</p>
            </div>
            {chat.unread > 0 && (
              <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                {chat.unread}
              </span>
            )}
          </Card>
        ))}
      </div>
      <BottomNav role="customer" />
    </div>
  );
}
