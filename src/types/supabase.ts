export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string;
          after: Json | null;
          before: Json | null;
          changed_at: string;
          changed_by: string | null;
          entity_id: string;
          entity_type: string;
          id: string;
          job_id: string | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          after?: Json | null;
          before?: Json | null;
          changed_at?: string;
          changed_by?: string | null;
          entity_id: string;
          entity_type: string;
          id?: string;
          job_id?: string | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          after?: Json | null;
          before?: Json | null;
          changed_at?: string;
          changed_by?: string | null;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          job_id?: string | null;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_changed_by_fkey";
            columns: ["changed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      damage_incidents: {
        Row: {
          claim_filed: boolean;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string;
          estimated_cost: number;
          id: string;
          item: string;
          job_id: string;
          photo_paths: string[];
        };
        Insert: {
          claim_filed: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description: string;
          estimated_cost: number;
          id?: string;
          item: string;
          job_id: string;
          photo_paths: string[];
        };
        Update: {
          claim_filed?: boolean;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string;
          estimated_cost?: number;
          id?: string;
          item?: string;
          job_id?: string;
          photo_paths?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "damage_incidents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "damage_incidents_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          created_at: string;
          crew_ids: string[];
          date: string;
          delivered_by: Database["public"]["Enums"]["delivered_by"];
          dest_city: string;
          dest_state: string;
          driver_id: string;
          id: string;
          job_number: string;
          on_time_delivery: boolean | null;
          on_time_pickup: boolean | null;
          origin_city: string;
          origin_state: string;
        };
        Insert: {
          created_at?: string;
          crew_ids?: string[];
          date: string;
          delivered_by?: Database["public"]["Enums"]["delivered_by"];
          dest_city: string;
          dest_state: string;
          driver_id: string;
          id?: string;
          job_number: string;
          on_time_delivery?: boolean | null;
          on_time_pickup?: boolean | null;
          origin_city: string;
          origin_state: string;
        };
        Update: {
          created_at?: string;
          crew_ids?: string[];
          date?: string;
          delivered_by?: Database["public"]["Enums"]["delivered_by"];
          dest_city?: string;
          dest_state?: string;
          driver_id?: string;
          id?: string;
          job_number?: string;
          on_time_delivery?: boolean | null;
          on_time_pickup?: boolean | null;
          origin_city?: string;
          origin_state?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_driver_id_fkey";
            columns: ["driver_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_costs: {
        Row: {
          cost: number;
          id: string;
          month: string;
          source: Database["public"]["Enums"]["lead_source"];
        };
        Insert: {
          cost: number;
          id?: string;
          month: string;
          source: Database["public"]["Enums"]["lead_source"];
        };
        Update: {
          cost?: number;
          id?: string;
          month?: string;
          source?: Database["public"]["Enums"]["lead_source"];
        };
        Relationships: [];
      };
      leads: {
        Row: {
          booked_date: string | null;
          cost_overridden: boolean;
          created_at: string;
          date: string;
          granot_id: string;
          id: string;
          job_value: number | null;
          lead_cost: number;
          raw: Json | null;
          rep_id: string | null;
          source: Database["public"]["Enums"]["lead_source"];
          status: Database["public"]["Enums"]["lead_status"];
          updated_at: string;
        };
        Insert: {
          booked_date?: string | null;
          cost_overridden?: boolean;
          created_at?: string;
          date: string;
          granot_id: string;
          id?: string;
          job_value?: number | null;
          lead_cost?: number;
          raw?: Json | null;
          rep_id?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Update: {
          booked_date?: string | null;
          cost_overridden?: boolean;
          created_at?: string;
          date?: string;
          granot_id?: string;
          id?: string;
          job_value?: number | null;
          lead_cost?: number;
          raw?: Json | null;
          rep_id?: string | null;
          source?: Database["public"]["Enums"]["lead_source"];
          status?: Database["public"]["Enums"]["lead_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_rep_id_fkey";
            columns: ["rep_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pre_damages: {
        Row: {
          captured_at_device: string;
          created_by: string | null;
          customer_name: string;
          customer_shown: boolean;
          deleted_at: string | null;
          description: string;
          id: string;
          item: string;
          job_id: string;
          lat: number | null;
          lng: number | null;
          location: string;
          locked: boolean;
          notes: string | null;
          photo_paths: string[];
          received_at_server: string;
          signature_path: string;
          synced_offline: boolean;
        };
        Insert: {
          captured_at_device: string;
          created_by?: string | null;
          customer_name: string;
          customer_shown: boolean;
          deleted_at?: string | null;
          description: string;
          id?: string;
          item: string;
          job_id: string;
          lat?: number | null;
          lng?: number | null;
          location: string;
          locked?: boolean;
          notes?: string | null;
          photo_paths: string[];
          received_at_server?: string;
          signature_path: string;
          synced_offline?: boolean;
        };
        Update: {
          captured_at_device?: string;
          created_by?: string | null;
          customer_name?: string;
          customer_shown?: boolean;
          deleted_at?: string | null;
          description?: string;
          id?: string;
          item?: string;
          job_id?: string;
          lat?: number | null;
          lng?: number | null;
          location?: string;
          locked?: boolean;
          notes?: string | null;
          photo_paths?: string[];
          received_at_server?: string;
          signature_path?: string;
          synced_offline?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "pre_damages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pre_damages_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          avatar_url: string | null;
          created_at: string;
          email: string;
          id: string;
          name: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          id: string;
          name: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          driver_mentioned: boolean;
          id: string;
          job_id: string;
          link: string | null;
          platform: Database["public"]["Enums"]["review_platform"];
          screenshot_path: string | null;
          stars: number;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          driver_mentioned: boolean;
          id?: string;
          job_id: string;
          link?: string | null;
          platform: Database["public"]["Enums"]["review_platform"];
          screenshot_path?: string | null;
          stars: number;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          driver_mentioned?: boolean;
          id?: string;
          job_id?: string;
          link?: string | null;
          platform?: Database["public"]["Enums"]["review_platform"];
          screenshot_path?: string | null;
          stars?: number;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      settings: {
        Row: {
          company: Json;
          damage_alert_emails: string[];
          id: number;
          updated_at: string;
        };
        Insert: {
          company: Json;
          damage_alert_emails?: string[];
          id?: number;
          updated_at?: string;
        };
        Update: {
          company?: Json;
          damage_alert_emails?: string[];
          id?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      sync_receipts: {
        Row: {
          client_id: string;
          created_at: string;
          result: Json;
          user_id: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          result: Json;
          user_id: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          result?: Json;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_receipts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      upsells: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          id: string;
          job_id: string;
          type: Database["public"]["Enums"]["upsell_type"];
          verified: boolean;
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          job_id: string;
          type: Database["public"]["Enums"]["upsell_type"];
          verified?: boolean;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          id?: string;
          job_id?: string;
          type?: Database["public"]["Enums"]["upsell_type"];
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "upsells_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "upsells_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_correct_pre_damage: {
        Args: {
          p_customer_name: string;
          p_description: string;
          p_id: string;
          p_item: string;
          p_location: string;
          p_notes: string;
          p_reason: string;
        };
        Returns: string;
      };
      admin_set_deleted: {
        Args: {
          p_deleted: boolean;
          p_id: string;
          p_kind: string;
          p_reason?: string;
        };
        Returns: string;
      };
      admin_set_lead_cost: {
        Args: {
          p_cost: number;
          p_month: string;
          p_source: Database["public"]["Enums"]["lead_source"];
        };
        Returns: number;
      };
      app_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: never; Returns: boolean };
      new_deleted_is_null: { Args: { p: Json }; Returns: boolean };
      owns_job: { Args: { p_job: string }; Returns: boolean };
    };
    Enums: {
      delivered_by: "drs" | "partner";
      lead_source:
        | "google_ppc"
        | "tv_ad"
        | "google_lead"
        | "direct"
        | "referral"
        | "other";
      lead_status: "open" | "booked" | "lost";
      review_platform: "google" | "bbb" | "trustpilot" | "facebook" | "other";
      upsell_type: "packing" | "storage" | "materials" | "other";
      user_role: "admin" | "driver" | "sales_rep";
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      delivered_by: ["drs", "partner"],
      lead_source: [
        "google_ppc",
        "tv_ad",
        "google_lead",
        "direct",
        "referral",
        "other",
      ],
      lead_status: ["open", "booked", "lost"],
      review_platform: ["google", "bbb", "trustpilot", "facebook", "other"],
      upsell_type: ["packing", "storage", "materials", "other"],
      user_role: ["admin", "driver", "sales_rep"],
    },
  },
} as const;
