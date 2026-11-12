export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      badges: {
        Row: {
          description: string | null;
          icon_url: string | null;
          id: number;
          is_active: boolean;
          name: string;
          requirement_type: string;
          requirement_value: number;
        };
        Insert: {
          description?: string | null;
          icon_url?: string | null;
          id?: never;
          is_active?: boolean;
          name: string;
          requirement_type: string;
          requirement_value: number;
        };
        Update: {
          description?: string | null;
          icon_url?: string | null;
          id?: never;
          is_active?: boolean;
          name?: string;
          requirement_type?: string;
          requirement_value?: number;
        };
        Relationships: [];
      };
      checkins: {
        Row: {
          created_at: string;
          crowd_level: number;
          floor_id: number;
          id: number;
          user_id: number;
        };
        Insert: {
          created_at?: string;
          crowd_level: number;
          floor_id: number;
          id?: never;
          user_id: number;
        };
        Update: {
          created_at?: string;
          crowd_level?: number;
          floor_id?: number;
          id?: never;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "checkins_floor_id_fkey";
            columns: ["floor_id"];
            isOneToOne: false;
            referencedRelation: "floors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checkins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      floors: {
        Row: {
          floor_name: string;
          id: number;
          is_active: boolean;
          location_id: number;
          qr_code_id: string;
        };
        Insert: {
          floor_name: string;
          id?: never;
          is_active?: boolean;
          location_id: number;
          qr_code_id: string;
        };
        Update: {
          floor_name?: string;
          id?: never;
          is_active?: boolean;
          location_id?: number;
          qr_code_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "floors_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      location_hours: {
        Row: {
          close_time: string;
          day_of_week: number;
          id: number;
          location_id: number;
          open_time: string;
        };
        Insert: {
          close_time: string;
          day_of_week: number;
          id?: never;
          location_id: number;
          open_time: string;
        };
        Update: {
          close_time?: string;
          day_of_week?: number;
          id?: never;
          location_id?: number;
          open_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "location_hours_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      location_profiles: {
        Row: {
          details: NonNullable<Json>;
          location_id: number;
        };
        Insert: {
          details?: NonNullable<Json>;
          location_id: number;
        };
        Update: {
          details?: NonNullable<Json>;
          location_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "location_profiles_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: true;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          building: string | null;
          category: string;
          gps_lat: number;
          gps_lng: number;
          id: number;
          image_url: string | null;
          is_active: boolean;
          name: string;
        };
        Insert: {
          building?: string | null;
          category: string;
          gps_lat: number;
          gps_lng: number;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
        };
        Update: {
          building?: string | null;
          category?: string;
          gps_lat?: number;
          gps_lng?: number;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          id: number;
          redeemed_at: string;
          reward_id: number;
          status: string;
          used_points: number;
          user_id: number;
        };
        Insert: {
          id?: never;
          redeemed_at?: string;
          reward_id: number;
          status?: string;
          used_points: number;
          user_id: number;
        };
        Update: {
          id?: never;
          redeemed_at?: string;
          reward_id?: number;
          status?: string;
          used_points?: number;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey";
            columns: ["reward_id"];
            isOneToOne: false;
            referencedRelation: "rewards";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rewards: {
        Row: {
          description: string | null;
          expires_at: string | null;
          id: number;
          image_url: string | null;
          points_required: number;
          starts_at: string | null;
          status: string;
          stock: number | null;
          title: string;
        };
        Insert: {
          description?: string | null;
          expires_at?: string | null;
          id?: never;
          image_url?: string | null;
          points_required: number;
          starts_at?: string | null;
          status?: string;
          stock?: number | null;
          title: string;
        };
        Update: {
          description?: string | null;
          expires_at?: string | null;
          id?: never;
          image_url?: string | null;
          points_required?: number;
          starts_at?: string | null;
          status?: string;
          stock?: number | null;
          title?: string;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          badge_id: number;
          earned_at: string;
          user_id: number;
        };
        Insert: {
          badge_id: number;
          earned_at?: string;
          user_id: number;
        };
        Update: {
          badge_id?: number;
          earned_at?: string;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey";
            columns: ["badge_id"];
            isOneToOne: false;
            referencedRelation: "badges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_badges_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          auth_id: string;
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: number;
          name: string;
          points: number;
        };
        Insert: {
          auth_id: string;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id?: never;
          name: string;
          points?: number;
        };
        Update: {
          auth_id?: string;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: never;
          name?: string;
          points?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
