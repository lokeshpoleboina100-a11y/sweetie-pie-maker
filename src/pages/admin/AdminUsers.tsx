import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Shield, ShieldOff, ChevronLeft, ChevronRight, Star, MapPin } from 'lucide-react';
import { adminFetch } from '@/lib/admin-api';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  phone: string | null;
  avatar_url: string | null;
  rating: number | null;
  total_reviews: number | null;
  total_jobs_completed: number | null;
  is_verified: boolean | null;
  location_name: string | null;
  created_at: string;
  skills: string[] | null;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (p = page, s = search) => {
    setLoading(true);
    try {
      const data = await adminFetch('get_users', { page: p, limit: 20, search: s || undefined });
      setUsers(data.users);
      setTotal(data.total);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page]);

  const handleSearch = () => {
    setPage(0);
    fetchUsers(0, search);
  };

  const toggleVerify = async (userId: string, current: boolean) => {
    await adminFetch('toggle_verify', { userId, verified: !current });
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, is_verified: !current } : u))
    );
    toast({ title: !current ? 'User verified' : 'Verification removed' });
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-2xl font-extrabold">User Management</h2>

      <div className="flex gap-2">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" /> Search
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {u.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{u.full_name}</span>
                    <Badge variant={u.role === 'worker' ? 'default' : 'secondary'} className="text-[10px]">
                      {u.role}
                    </Badge>
                    {u.is_verified && (
                      <Badge className="bg-accent text-accent-foreground text-[10px] gap-1">
                        <Shield className="h-3 w-3" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    {u.rating !== null && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-warning text-warning" /> {u.rating} ({u.total_reviews})
                      </span>
                    )}
                    {u.location_name && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {u.location_name}
                      </span>
                    )}
                    <span>Joined {new Date(u.created_at).toLocaleDateString('en-IN')}</span>
                    {u.total_jobs_completed ? <span>{u.total_jobs_completed} jobs done</span> : null}
                  </div>
                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.skills.map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => toggleVerify(u.user_id, !!u.is_verified)}
                >
                  {u.is_verified ? <ShieldOff className="h-4 w-4 mr-1" /> : <Shield className="h-4 w-4 mr-1" />}
                  {u.is_verified ? 'Unverify' : 'Verify'}
                </Button>
              </div>
            </Card>
          ))}

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users found.</p>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
