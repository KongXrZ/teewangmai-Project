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
      users: {
        Row: {
          id: number;
          auth_id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          auth_id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          points?: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          auth_id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          points?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: number;
          name: string;
          category: string;
          building: string | null;
          floor: string | null;
          gps_lat: number;
          gps_lng: number;
          qr_code_id: string;
          image_url: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: never;
          name: string;
          category: string;
          building?: string | null;
          floor?: string | null;
          gps_lat: number;
          gps_lng: number;
          qr_code_id: string;
          image_url?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: never;
          name?: string;
          category?: string;
          building?: string | null;
          floor?: string | null;
          gps_lat?: number;
          gps_lng?: number;
          qr_code_id?: string;
          image_url?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      location_hours: {
        Row: {
          id: number;
          location_id: number;
          day_of_week: number;
          open_time: string;
          close_time: string;
        };
        Insert: {
          id?: never;
          location_id: number;
          day_of_week: number;
          open_time: string;
          close_time: string;
        };
        Update: {
          id?: never;
          location_id?: number;
          day_of_week?: number;
          open_time?: string;
          close_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'location_hours_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      location_profiles: {
        Row: {
          location_id: number;
          details: Json;
        };
        Insert: {
          location_id: number;
          details?: Json;
        };
        Update: {
          location_id?: number;
          details?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'location_profiles_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: true;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      checkins: {
        Row: {
          id: number;
          user_id: number;
          location_id: number;
          crowd_level: number;
          created_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          location_id: number;
          crowd_level: number;
          created_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          location_id?: number;
          crowd_level?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'checkins_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'checkins_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      badges: {
        Row: {
          id: number;
          name: string;
          description: string | null;
          requirement_type: string;
          requirement_value: number;
          icon_url: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: never;
          name: string;
          description?: string | null;
          requirement_type: string;
          requirement_value: number;
          icon_url?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: never;
          name?: string;
          description?: string | null;
          requirement_type?: string;
          requirement_value?: number;
          icon_url?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      user_badges: {
        Row: {
          user_id: number;
          badge_id: number;
          earned_at: string;
        };
        Insert: {
          user_id: number;
          badge_id: number;
          earned_at?: string;
        };
        Update: {
          user_id?: number;
          badge_id?: number;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_badges_badge_id_fkey';
            columns: ['badge_id'];
            isOneToOne: false;
            referencedRelation: 'badges';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_badges_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      rewards: {
        Row: {
          id: number;
          title: string;
          description: string | null;
          points_required: number;
          stock: number | null;
          image_url: string | null;
          status: string;
          starts_at: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: never;
          title: string;
          description?: string | null;
          points_required: number;
          stock?: number | null;
          image_url?: string | null;
          status?: string;
          starts_at?: string | null;
          expires_at?: string | null;
        };
        Update: {
          id?: never;
          title?: string;
          description?: string | null;
          points_required?: number;
          stock?: number | null;
          image_url?: string | null;
          status?: string;
          starts_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          id: number;
          user_id: number;
          reward_id: number;
          used_points: number;
          status: string;
          redeemed_at: string;
        };
        Insert: {
          id?: never;
          user_id: number;
          reward_id: number;
          used_points: number;
          status?: string;
          redeemed_at?: string;
        };
        Update: {
          id?: never;
          user_id?: number;
          reward_id?: number;
          used_points?: number;
          status?: string;
          redeemed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'redemptions_reward_id_fkey';
            columns: ['reward_id'];
            isOneToOne: false;
            referencedRelation: 'rewards';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'redemptions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      handle_new_user: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      protect_user_points: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
