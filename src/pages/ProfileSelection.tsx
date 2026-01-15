import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Briefcase, Home } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfileRoles } from "@/hooks/useProfileRoles";
import { useActiveRole, ActiveRole } from "@/contexts/ActiveRoleContext";
import { FinLarLogo } from "@/components/FinLarLogo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleCardProps {
  role: ActiveRole;
  icon: React.ElementType;
  title: string;
  description: string;
  onClick: () => void;
}

function RoleCard({ icon: Icon, title, description, onClick }: RoleCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
      onClick={onClick}
    >
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-lg mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <CardDescription className="text-sm">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

export default function ProfileSelection() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { 
    canAccessPlannerAdmin, 
    canAccessPlanner, 
    canAccessUser, 
    hasMultipleRoles,
    loading: rolesLoading 
  } = useProfileRoles();
  const { setActiveRole, activeRole } = useActiveRole();

  const isLoading = authLoading || rolesLoading;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // If user already has an active role and tries to access this page, redirect them
  useEffect(() => {
    if (!rolesLoading && activeRole && !hasMultipleRoles) {
      // Single role user with active role - redirect to their dashboard
      if (activeRole === "user") {
        navigate("/dashboard");
      } else {
        navigate("/planner");
      }
    }
  }, [activeRole, hasMultipleRoles, rolesLoading, navigate]);

  // If user only has one role, auto-select and redirect
  useEffect(() => {
    if (!rolesLoading && !hasMultipleRoles && !activeRole) {
      if (canAccessPlannerAdmin) {
        setActiveRole("planner_admin");
        navigate("/planner");
      } else if (canAccessPlanner) {
        setActiveRole("planner");
        navigate("/planner");
      } else if (canAccessUser) {
        setActiveRole("user");
        navigate("/dashboard");
      } else {
        // User without any roles - send to house setup
        // Note: Pure planners are already handled above, so this is only for regular users
        setActiveRole("user");
        navigate("/house-setup");
      }
    }
  }, [rolesLoading, hasMultipleRoles, activeRole, canAccessPlannerAdmin, canAccessPlanner, canAccessUser, setActiveRole, navigate]);

  const handleSelectRole = (role: ActiveRole) => {
    setActiveRole(role);
    if (role === "user") {
      navigate("/dashboard");
    } else {
      navigate("/planner");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Only show selection if user has multiple roles
  if (!hasMultipleRoles) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="py-8">
        <div className="flex justify-center">
          <FinLarLogo size="lg" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Como deseja acessar?
            </h1>
            <p className="text-muted-foreground">
              Escolha o perfil para esta sessão
            </p>
          </div>

          <div className="grid gap-4">
            {canAccessPlannerAdmin && (
              <RoleCard
                role="planner_admin"
                icon={Shield}
                title="Admin Planejador"
                description="Gestão completa da equipe e configurações do escritório"
                onClick={() => handleSelectRole("planner_admin")}
              />
            )}

            {canAccessPlanner && !canAccessPlannerAdmin && (
              <RoleCard
                role="planner"
                icon={Briefcase}
                title="Planejador"
                description="Ferramentas de planejamento e acesso a clientes"
                onClick={() => handleSelectRole("planner")}
              />
            )}

            {canAccessUser && (
              <RoleCard
                role="user"
                icon={Home}
                title="Usuário"
                description="Dashboard financeiro pessoal e da sua casa"
                onClick={() => handleSelectRole("user")}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
