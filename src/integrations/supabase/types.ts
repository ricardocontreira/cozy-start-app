export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      credit_cards: {
        Row: {
          brand: Database["public"]["Enums"]["card_brand"]
          closing_day: number | null
          color: string
          created_at: string
          created_by: string
          due_day: number | null
          house_id: string
          icon: string | null
          id: string
          last_digits: string
          name: string
          updated_at: string
        }
        Insert: {
          brand: Database["public"]["Enums"]["card_brand"]
          closing_day?: number | null
          color?: string
          created_at?: string
          created_by: string
          due_day?: number | null
          house_id: string
          icon?: string | null
          id?: string
          last_digits: string
          name: string
          updated_at?: string
        }
        Update: {
          brand?: Database["public"]["Enums"]["card_brand"]
          closing_day?: number | null
          color?: string
          created_at?: string
          created_by?: string
          due_day?: number | null
          house_id?: string
          icon?: string | null
          id?: string
          last_digits?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          annual_interest_rate: number
          created_at: string
          deadline: string
          house_id: string
          id: string
          initial_capital: number
          target_amount: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          annual_interest_rate?: number
          created_at?: string
          deadline: string
          house_id: string
          id?: string
          initial_capital?: number
          target_amount: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          annual_interest_rate?: number
          created_at?: string
          deadline?: string
          house_id?: string
          id?: string
          initial_capital?: number
          target_amount?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string
          description: string
          goal_id: string
          house_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          contribution_date: string
          created_at?: string
          description: string
          goal_id: string
          house_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string
          description?: string
          goal_id?: string
          house_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "financial_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      house_members: {
        Row: {
          house_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          house_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          house_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "house_members_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      houses: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      planner_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invite_code: string
          planner_id: string
          updated_at: string | null
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          planner_id: string
          updated_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          planner_id?: string
          updated_at?: string | null
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_invites_planner_id_fkey"
            columns: ["planner_id"]
            isOneToOne: false
            referencedRelation: "planner_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_profiles: {
        Row: {
          client_invite_limit: number | null
          cnpj: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          onboarding_complete: boolean | null
          parent_planner_id: string | null
          planner_role: string
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          client_invite_limit?: number | null
          cnpj?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          onboarding_complete?: boolean | null
          parent_planner_id?: string | null
          planner_role?: string
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          client_invite_limit?: number | null
          cnpj?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          onboarding_complete?: boolean | null
          parent_planner_id?: string | null
          planner_role?: string
          razao_social?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_profiles_parent_planner_id_fkey"
            columns: ["parent_planner_id"]
            isOneToOne: false
            referencedRelation: "planner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          bypass_subscription: boolean
          cnpj: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          parent_planner_id: string | null
          phone: string | null
          planner_onboarding_complete: boolean | null
          profile_role: Database["public"]["Enums"]["profile_role"]
          razao_social: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          bypass_subscription?: boolean
          cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          parent_planner_id?: string | null
          phone?: string | null
          planner_onboarding_complete?: boolean | null
          profile_role?: Database["public"]["Enums"]["profile_role"]
          razao_social?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          bypass_subscription?: boolean
          cnpj?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          parent_planner_id?: string | null
          phone?: string | null
          planner_onboarding_complete?: boolean | null
          profile_role?: Database["public"]["Enums"]["profile_role"]
          razao_social?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_planner_id_fkey"
            columns: ["parent_planner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          billing_month: string | null
          card_id: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string
          house_id: string
          id: string
          installment: string | null
          recurrence_id: string | null
          transaction_date: string
          type: string
          updated_at: string
          upload_id: string | null
        }
        Insert: {
          amount: number
          billing_month?: string | null
          card_id?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description: string
          house_id: string
          id?: string
          installment?: string | null
          recurrence_id?: string | null
          transaction_date: string
          type?: string
          updated_at?: string
          upload_id?: string | null
        }
        Update: {
          amount?: number
          billing_month?: string | null
          card_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string
          house_id?: string
          id?: string
          installment?: string | null
          recurrence_id?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "upload_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_logs: {
        Row: {
          billing_month: string | null
          card_id: string
          created_at: string
          filename: string
          house_id: string
          id: string
          items_count: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          billing_month?: string | null
          card_id: string
          created_at?: string
          filename: string
          house_id: string
          id?: string
          items_count?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          billing_month?: string | null
          card_id?: string
          created_at?: string
          filename?: string
          house_id?: string
          id?: string
          items_count?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_logs_house_id_fkey"
            columns: ["house_id"]
            isOneToOne: false
            referencedRelation: "houses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          bypass_subscription: boolean | null
          created_at: string | null
          full_name: string | null
          id: string
          invited_by_planner_id: string | null
          phone: string | null
          stripe_customer_id: string | null
          subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          bypass_subscription?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id: string
          invited_by_planner_id?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          bypass_subscription?: boolean | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          invited_by_planner_id?: string | null
          phone?: string | null
          stripe_customer_id?: string | null
          subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_invited_by_planner_id_fkey"
            columns: ["invited_by_planner_id"]
            isOneToOne: false
            referencedRelation: "planner_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_house_with_owner: { Args: { house_name: string }; Returns: string }
      get_house_invite_code: {
        Args: { house_id_param: string }
        Returns: string
      }
      get_house_role: {
        Args: { _house_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_planner_invite_stats: {
        Args: { planner_uuid: string }
        Returns: Json
      }
      get_planner_role: { Args: { _user_id: string }; Returns: string }
      get_profile_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["profile_role"]
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      is_house_member: {
        Args: { _house_id: string; _user_id: string }
        Returns: boolean
      }
      is_normal_user: { Args: { _user_id: string }; Returns: boolean }
      is_planner: { Args: { _user_id: string }; Returns: boolean }
      is_planner_admin: { Args: { _user_id: string }; Returns: boolean }
      is_planner_user: { Args: { _user_id: string }; Returns: boolean }
      join_house_by_code: { Args: { code: string }; Returns: string }
      regenerate_invite_code: {
        Args: { house_id_param: string }
        Returns: string
      }
      unlink_planner_client: {
        Args: { client_user_id: string }
        Returns: boolean
      }
      use_planner_invite: {
        Args: { client_user_id: string; code: string }
        Returns: string
      }
      validate_invite_code: { Args: { code: string }; Returns: Json }
    }
    Enums: {
      app_role: "owner" | "viewer"
      card_brand: "visa" | "mastercard" | "elo"
      profile_role: "user" | "planner_admin" | "planner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "viewer"],
      card_brand: ["visa", "mastercard", "elo"],
      profile_role: ["user", "planner_admin", "planner"],
    },
  },
} as const
