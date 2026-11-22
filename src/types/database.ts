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
      floor_hours: {
        Row: {
          close_time: string;
          day_of_week: number;
          floor_id: number;
          id: number;
          is_active: boolean;
          open_time: string;
        };
        Insert: {
          close_time?: string;
          day_of_week: number;
          floor_id: number;
          id?: never;
          is_active?: boolean;
          open_time?: string;
        };
        Update: {
          close_time?: string;
          day_of_week?: number;
          floor_id?: number;
          id?: never;
          is_active?: boolean;
          open_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "floor_hours_floor_id_fkey";
            columns: ["floor_id"];
            isOneToOne: false;
            referencedRelation: "floors";
            referencedColumns: ["id"];
          },
        ];
      };
      floors: {
        Row: {
          capacity: number | null;
          floor_name: string;
          id: number;
          is_active: boolean;
          location_id: number;
          qr_code_id: string;
        };
        Insert: {
          capacity?: number | null;
          floor_name: string;
          id?: never;
          is_active?: boolean;
          location_id: number;
          qr_code_id: string;
        };
        Update: {
          capacity?: number | null;
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
      locations: {
        Row: {
          aliases: string[];
          building: string;
          category: string[];
          details: NonNullable<Json>;
          gps_lat: number;
          gps_lng: number;
          id: number;
          image_url: string | null;
          is_active: boolean;
          name: string;
        };
        Insert: {
          aliases?: string[];
          building: string;
          category: string[];
          details?: NonNullable<Json>;
          gps_lat: number;
          gps_lng: number;
          id?: never;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
        };
        Update: {
          aliases?: string[];
          building?: string;
          category?: string[];
          details?: NonNullable<Json>;
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
          expires_at: string;
          id: number;
          idempotency_key: string;
          redeemed_at: string;
          reward_id: number;
          status: string;
          use_code: string | null;
          use_key: string | null;
          used_at: string | null;
          used_points: number;
          user_id: number;
          verified_at: string | null;
        };
        Insert: {
          expires_at: string;
          id?: never;
          idempotency_key?: string;
          redeemed_at?: string;
          reward_id: number;
          status?: string;
          use_code?: string | null;
          use_key?: string | null;
          used_at?: string | null;
          used_points: number;
          user_id: number;
          verified_at?: string | null;
        };
        Update: {
          expires_at?: string;
          id?: never;
          idempotency_key?: string;
          redeemed_at?: string;
          reward_id?: number;
          status?: string;
          use_code?: string | null;
          use_key?: string | null;
          used_at?: string | null;
          used_points?: number;
          user_id?: number;
          verified_at?: string | null;
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
          expires_at: string;
          id: number;
          image_url: string | null;
          max_per_user: number;
          points_required: number;
          starts_at: string | null;
          status: string;
          stock: number;
          title: string;
          valid_days: number;
        };
        Insert: {
          description?: string | null;
          expires_at: string;
          id?: never;
          image_url?: string | null;
          max_per_user?: number;
          points_required: number;
          starts_at?: string | null;
          status?: string;
          stock?: number;
          title: string;
          valid_days?: number;
        };
        Update: {
          description?: string | null;
          expires_at?: string;
          id?: never;
          image_url?: string | null;
          max_per_user?: number;
          points_required?: number;
          starts_at?: string | null;
          status?: string;
          stock?: number;
          title?: string;
          valid_days?: number;
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
      get_crowd_summaries: {
        Args: { p_floor_id?: number; p_location_id?: number };
        Returns: {
          average_score: number;
          calculated_at: string;
          capacity: number;
          density_percent: number;
          floor_id: number;
          floor_name: string;
          latest_report_at: string;
          location_id: number;
          report_count: number;
        }[];
      };
      get_my_badges: {
        Args: Record<PropertyKey, never>;
        Returns: {
          description: string;
          earned_at: string;
          icon_url: string;
          id: number;
          is_active: boolean;
          name: string;
          requirement_type: string;
          requirement_value: number;
        }[];
      };
      get_my_checkins: {
        Args: {
          p_before_created_at?: string;
          p_before_id?: number;
          p_limit: number;
        };
        Returns: {
          building: string;
          created_at: string;
          crowd_level: number;
          floor_id: number;
          floor_name: string;
          id: number;
          location_id: number;
          location_name: string;
          matching_count: number;
        }[];
      };
      get_my_streak: {
        Args: Record<PropertyKey, never>;
        Returns: {
          checked_in_today: boolean;
          current_streak: number;
          last_checkin_date: string | null;
          longest_streak: number;
        }[];
      };
      get_my_vouchers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          expires_at: string;
          id: number;
          image_url: string;
          redeemed_at: string;
          reward_id: number;
          status: string;
          title: string;
          used_at: string;
          used_points: number;
        }[];
      };
      get_reward_catalog: {
        Args: Record<PropertyKey, never>;
        Returns: {
          availability: string;
          description: string;
          expires_at: string;
          id: number;
          image_url: string;
          max_per_user: number;
          points_required: number;
          redeemed_count: number;
          starts_at: string;
          stock: number;
          title: string;
          valid_days: number;
        }[];
      };
      redeem_reward: {
        Args: { p_idempotency_key: string; p_reward_id: number };
        Returns: {
          expires_at: string;
          outcome: string;
          points: number;
          redeemed_at: string;
          redemption_id: number;
          reward_id: number;
          used_points: number;
        }[];
      };
      resolve_floor_qr: {
        Args: { p_qr_code_id: string };
        Returns: {
          building: string;
          floor_id: number;
          floor_name: string;
          image_url: string;
          location_id: number;
          location_name: string;
        }[];
      };
      search_locations: {
        Args: { category_filter?: string; search_term?: string };
        Returns: {
          aliases: string[];
          building: string;
          category: string[];
          details: NonNullable<Json>;
          gps_lat: number;
          gps_lng: number;
          id: number;
          image_url: string | null;
          is_active: boolean;
          name: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "locations";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      submit_checkin: {
        Args: {
          p_accuracy_meters: number;
          p_crowd_level: number;
          p_latitude: number;
          p_longitude: number;
          p_qr_code_id: string;
        };
        Returns: {
          building: string;
          checkin_id: number;
          created_at: string;
          crowd_level: number;
          distance_meters: number;
          floor_id: number;
          floor_name: string;
          location_id: number;
          location_name: string;
          next_eligible_at: string;
          outcome: string;
          points_awarded: number | null;
          points_balance: number | null;
        }[];
      };
      use_voucher: {
        Args: { p_redemption_id: number; p_use_key: string };
        Returns: {
          id: number;
          outcome: string;
          use_code: string;
          used_at: string;
        }[];
      };
      verify_voucher_code: {
        Args: { p_use_code: string };
        Returns: {
          outcome: string;
          reward_title: string;
          used_at: string;
          used_points: number;
          verified_at: string;
        }[];
      };
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
