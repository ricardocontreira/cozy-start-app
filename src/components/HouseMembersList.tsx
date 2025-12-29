import { useState, useEffect } from "react";
import { Users, Crown, Eye, MoreVertical, UserMinus, ArrowUpDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RemoveMemberDialog } from "@/components/RemoveMemberDialog";

interface HouseMember {
  id: string;
  user_id: string;
  role: "owner" | "viewer";
  joined_at: string;
  profile: {
    full_name: string | null;
  } | null;
  email?: string;
}

interface HouseMembersListProps {
  houseId: string;
  isOwner: boolean;
  currentUserId: string;
}

export function HouseMembersList({ houseId, isOwner, currentUserId }: HouseMembersListProps) {
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<HouseMember | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMembers = async () => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from("house_members")
        .select("id, user_id, role, joined_at")
        .eq("house_id", houseId);

      if (membersError) throw membersError;

      // Fetch profiles for each member
      const membersList: HouseMember[] = [];
      
      for (const member of membersData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", member.user_id)
          .maybeSingle();

        membersList.push({
          ...member,
          role: member.role as "owner" | "viewer",
          profile: profileData,
        });
      }

      setMembers(membersList);
    } catch (error) {
      console.error("Error fetching members:", error);
      toast({
        title: "Erro ao carregar membros",
        description: "Não foi possível carregar a lista de membros.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [houseId]);

  const handleUpdateRole = async (memberId: string, userId: string, newRole: "owner" | "viewer") => {
    setUpdating(memberId);
    
    try {
      const { error } = await supabase
        .from("house_members")
        .update({ role: newRole })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Papel atualizado!",
        description: `O membro agora é ${newRole === "owner" ? "proprietário" : "visualizador"}.`,
      });

      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar papel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const { error } = await supabase
        .from("house_members")
        .delete()
        .eq("id", memberToRemove.id);

      if (error) throw error;

      toast({
        title: "Membro removido!",
        description: "O membro foi removido da casa.",
      });

      setMemberToRemove(null);
      fetchMembers();
    } catch (error: any) {
      toast({
        title: "Erro ao remover membro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membros ({members.length})
          </CardTitle>
          <CardDescription>
            {isOwner 
              ? "Gerencie os membros da sua casa" 
              : "Visualize os membros da casa"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.user_id === currentUserId;
            const displayName = member.profile?.full_name || "Usuário";
            const canManage = isOwner && !isCurrentUser;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {displayName}
                      {isCurrentUser && (
                        <span className="text-muted-foreground text-sm ml-1">(você)</span>
                      )}
                    </p>
                    <Badge 
                      variant={member.role === "owner" ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {member.role === "owner" ? (
                        <>
                          <Crown className="w-3 h-3 mr-1" />
                          Proprietário
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3 mr-1" />
                          Visualizador
                        </>
                      )}
                    </Badge>
                  </div>
                </div>

                {canManage && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={updating === member.id}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleUpdateRole(
                          member.id, 
                          member.user_id, 
                          member.role === "owner" ? "viewer" : "owner"
                        )}
                        className="gap-2"
                      >
                        <ArrowUpDown className="w-4 h-4" />
                        {member.role === "owner" ? "Tornar Visualizador" : "Tornar Proprietário"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setMemberToRemove(member)}
                        className="gap-2 text-destructive"
                      >
                        <UserMinus className="w-4 h-4" />
                        Remover Membro
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}

          {members.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum membro encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <RemoveMemberDialog
        open={!!memberToRemove}
        onOpenChange={() => setMemberToRemove(null)}
        onConfirm={handleRemoveMember}
        memberName={memberToRemove?.profile?.full_name || "este membro"}
      />
    </>
  );
}
